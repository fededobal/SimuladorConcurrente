import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Hourglass, Minus, Moon, Play, Timer } from 'lucide-react';
import { handleEditingKey } from '../editor/editing';
import { highlight } from '../editor/highlight';
import {
  gutterChipsOf, isRunning, lineMarksOf, type ActiveLine, type LineMark, type LineTag,
} from '../editor/lineMarks';
import { useLineMetrics } from '../editor/useLineMetrics';
import { delayLeft, STATE_CLASS, STATE_HINT, type VisibleState } from '../processStates';
import s from './CodeEditor.module.css';

/** Posicion del cursor en el codigo, las dos desde 1. */
export interface CursorPosition {
  readonly line: number;
  readonly column: number;
}

interface Props {
  readonly code: string;
  readonly onChange: (code: string) => void;
  readonly readOnly: boolean;
  readonly activeLines: readonly ActiveLine[];
  /** Lineas con error: la de compilacion o las de los procesos que fallaron al ejecutar. */
  readonly errorLines: readonly number[];
  /** Duracion de un instante, en ms: el deslizamiento se acompasa a la simulacion. */
  readonly pasoMs: number;
  /** Tamano de letra del codigo, en px (zoom del editor). */
  readonly fontSize: number;
  /** Se llama cuando el cursor cambia de lugar (para la barra de estado). */
  readonly onCursor?: (position: CursorPosition) => void;
}

/** Margenes del texto dentro del area y del margen de numeros; iguales al modulo CSS. */
const TEXT_PAD = 8;
const GUTTER_PAD_LEFT = 34;
const GUTTER_PAD_RIGHT = 12;
/** Aire entre el final del codigo y la primera etiqueta. */
const TAG_GAP = 14;
/** Chips que se ven encimados en el margen de un renglon; el resto esta en las etiquetas. */
const CHIPS_PER_LINE = 2;
const CHIP_STEP = 9;
/** Avisos de procesos fuera de la vista que se muestran de cada lado. */
const MAX_NOTICES = 2;

/** Icono de cada estado: la etiqueta no depende solo del color. */
const STATE_ICON: Record<VisibleState, typeof Play | null> = {
  RUNNING_PROCESS: Play,
  RUNNING_MONITOR: Play,
  COMPETING: Hourglass,
  WAITING: Moon,
  DELAYED: Timer,
  READY: Minus,
  TERMINATED: null,
};

/** Franja visible del editor, en px desde el principio del documento. */
interface Viewport {
  readonly top: number;
  readonly height: number;
}

/**
 * Editor del programa: un textarea transparente sobre el codigo coloreado. Mientras corre la
 * simulacion marca donde esta cada proceso sin tapar el texto: una franja lisa por renglon,
 * un chip con la inicial del proceso en el margen y una etiqueta al final del codigo que dice
 * quien es y que esta haciendo. Si el renglon de un proceso queda fuera de la vista, un aviso
 * lo dice y lleva hasta ahi.
 */
export function CodeEditor({
  code, onChange, readOnly, activeLines, errorLines, pasoMs, fontSize, onCursor,
}: Props) {
  // El chip llega enseguida al renglon y se queda ahi: si el deslizamiento ocupara casi todo
  // el instante, pasaria mas tiempo entre dos renglones que sobre el que se esta ejecutando.
  const slideMs = Math.min(Math.round(pasoMs * 0.45), 260);

  const editorRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLPreElement>(null);
  const metrics = useLineMetrics(layerRef);
  const lines = useMemo(() => code.split('\n'), [code]);
  const yOf = (line: number) => metrics.top + (line - 1) * metrics.lineHeight;

  const marks = useMemo(() => lineMarksOf(activeLines), [activeLines]);
  // solo los chips que se ven: con mil procesos en un renglon, los otros 998 no se dibujan
  const chips = useMemo(
    () => gutterChipsOf(activeLines).filter((c) => c.slot < CHIPS_PER_LINE),
    [activeLines],
  );

  const gutterWidth = GUTTER_PAD_LEFT + GUTTER_PAD_RIGHT
    + String(lines.length).length * metrics.charWidth;

  // Franja visible, para saber que procesos quedaron fuera de la vista. Se lee a lo sumo una
  // vez por cuadro: el evento de scroll se dispara muchas veces por segundo.
  const [viewport, setViewport] = useState<Viewport>({ top: 0, height: 0 });
  const frame = useRef<number | null>(null);
  const readViewport = useCallback(() => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const el = editorRef.current;
      if (!el) return;
      setViewport((prev) => (prev.top === el.scrollTop && prev.height === el.clientHeight
        ? prev : { top: el.scrollTop, height: el.clientHeight }));
    });
  }, []);
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    readViewport();
    const observer = new ResizeObserver(readViewport);
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [readViewport]);

  const above = viewport.height === 0 ? []
    : marks.filter((m) => yOf(m.line) + metrics.lineHeight <= viewport.top);
  const below = viewport.height === 0 ? []
    : marks.filter((m) => yOf(m.line) >= viewport.top + viewport.height);
  const goToLine = (line: number) => {
    const el = editorRef.current;
    el?.scrollTo({ top: Math.max(0, yOf(line) - el.clientHeight / 2), behavior: 'smooth' });
  };

  const reportCursor = (ta: HTMLTextAreaElement) => {
    if (!onCursor) return;
    const before = ta.value.slice(0, ta.selectionStart);
    const lineStart = before.lastIndexOf('\n') + 1;
    onCursor({ line: before.split('\n').length, column: before.length - lineStart + 1 });
  };

  return (
    <div className={s.wrap}>
      <div
        ref={editorRef}
        className={s.editor}
        onScroll={readViewport}
        style={{
          ['--desliz' as string]: `${slideMs}ms`,
          // el interlineado acompana a la letra; las marcas se miden del DOM, asi que siguen
          ['--line-h' as string]: `${Math.round(fontSize * 1.7)}px`,
          ['--gutter-w' as string]: `${Math.ceil(gutterWidth)}px`,
          fontSize,
        }}
      >
        <div className={s.doc}>
          <div className={s.gutter}>
            {lines.map((_, i) => `${i + 1}\n`).join('')}
            {/* Un chip POR PROCESO, no por renglon: al avanzar sobrevive el mismo nodo del DOM
                y la transicion de CSS lo desliza hasta el renglon nuevo. */}
            {chips.map((c) => (
              <span
                key={c.name}
                className={`${s.gutterChip} ${STATE_CLASS[c.state]}${isRunning(c.state) ? ` ${s.activo}` : ''}`}
                style={{
                  top: yOf(c.line),
                  height: metrics.lineHeight,
                  left: 6 + c.slot * CHIP_STEP,
                  zIndex: CHIPS_PER_LINE - c.slot,
                  ['--st-proceso' as string]: c.color,
                }}
                aria-hidden="true"
              >
                <i>{c.name.charAt(0).toUpperCase()}</i>
              </span>
            ))}
          </div>
          <div className={s.area}>
            <pre ref={layerRef} className={s.layer} dangerouslySetInnerHTML={{ __html: highlight(code) + '\n' }} />

            {marks.map((m) => (
              <div
                key={m.line}
                className={`${s.lineBand} ${STATE_CLASS[m.state]}`}
                style={{ top: yOf(m.line), height: metrics.lineHeight, ['--st-proceso' as string]: m.color }}
              />
            ))}

            {errorLines.map((line) => (
              <div key={`error-${line}`} className={`${s.lineBand} ${s.lineError}`}
                style={{ top: yOf(line), height: metrics.lineHeight }} />
            ))}

            {marks.map((m) => (
              <div key={m.line} className={s.lineTags} style={{ top: yOf(m.line), height: metrics.lineHeight }}>
                <span
                  className={s.lineTagsGap}
                  style={{ flexBasis: TEXT_PAD + (lines[m.line - 1]?.length ?? 0) * metrics.charWidth + TAG_GAP }}
                />
                <span className={s.lineTagsList}>
                  {m.tags.map((t) => <Tag key={t.key} tag={t} />)}
                  {m.hiddenNames.length > 0 && (
                    <span className={`${s.lineTag} ${s.varios} st-ready`}
                      title={`También en este renglón: ${listNames(m.hiddenNames)}`}>
                      +{m.hiddenNames.length}
                    </span>
                  )}
                </span>
              </div>
            ))}

            <textarea
              value={code}
              spellCheck={false}
              readOnly={readOnly}
              aria-label="Código del programa"
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={readOnly ? undefined : handleEditingKey}
              onSelect={(e) => reportCursor(e.currentTarget)}
            />
          </div>
        </div>
      </div>

      <Notices marks={above} direction="up" onGo={goToLine} />
      <Notices marks={below} direction="down" onGo={goToLine} />
    </div>
  );
}

/** Los primeros nombres de una lista, para un texto emergente. */
function listNames(names: readonly string[]): string {
  const MAX = 20;
  return names.slice(0, MAX).join(', ') + (names.length > MAX ? '…' : '');
}

/** Etiqueta al final de un renglon: quien esta ahi y que esta haciendo. */
function Tag({ tag }: { tag: LineTag }) {
  const Icon = STATE_ICON[tag.state];
  const several = tag.names.length > 1;
  const hint = `${several ? listNames(tag.names) : tag.title}: ${STATE_HINT[tag.state]}`;
  return (
    <span
      className={`${s.lineTag} ${STATE_CLASS[tag.state]}${several ? ` ${s.varios}` : ''}`}
      style={{ ['--st-proceso' as string]: tag.color }}
      title={hint}
    >
      {Icon && <Icon size={11} strokeWidth={2.5} aria-hidden="true" />}
      {!isRunning(tag.state) && !several && <i className={s.lineTagDot} />}
      <b>{tag.title}</b>
      {tag.detail && <span>· {tag.detail}</span>}
      {tag.delayRemaining !== null && <span className={s.delayCount}>· {delayLeft(tag.delayRemaining)}</span>}
    </span>
  );
}

interface NoticesProps {
  /** Renglones con procesos que quedaron fuera de la vista de ese lado. */
  readonly marks: readonly LineMark[];
  readonly direction: 'up' | 'down';
  readonly onGo: (line: number) => void;
}

/** Avisos de los procesos que estan mas arriba o mas abajo de lo que se ve. */
function Notices({ marks, direction, onGo }: NoticesProps) {
  if (marks.length === 0) return null;
  // los mas cercanos a lo visible primero
  const near = direction === 'up' ? [...marks].reverse() : marks;
  const Arrow = direction === 'up' ? ArrowUp : ArrowDown;
  return (
    <div className={`${s.notices} ${direction === 'up' ? s.noticesAbove : s.noticesBelow}`}>
      {near.slice(0, MAX_NOTICES).map((m) => {
        const tag = m.tags[0];
        return (
          <button
            key={m.line}
            type="button"
            className={`${s.notice} ${STATE_CLASS[tag.state]}`}
            style={{ ['--st-proceso' as string]: tag.color }}
            onClick={() => onGo(m.line)}
            title={`Ir a la línea ${m.line}`}
          >
            <i className={s.noticeChip} aria-hidden="true">{tag.title.charAt(0).toUpperCase()}</i>
            <b>{tag.title}</b>
            <span>· línea {m.line}{tag.detail && ` · ${tag.detail}`}</span>
            <Arrow size={12} aria-hidden="true" />
          </button>
        );
      })}
      {near.length > MAX_NOTICES && (
        <button type="button" className={`${s.notice} st-ready`} onClick={() => onGo(near[MAX_NOTICES].line)}>
          +{near.length - MAX_NOTICES} renglones más con procesos
          <Arrow size={12} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
