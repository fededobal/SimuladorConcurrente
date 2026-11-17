import { useMemo, useRef } from 'react';
import { Hourglass, Minus, Moon, Play, Timer } from 'lucide-react';
import { handleEditingKey } from '../editor/editing';
import { highlight } from '../editor/highlight';
import {
  gutterChipsOf, isRunning, lineMarksOf, type ActiveLine, type LineTag,
} from '../editor/lineMarks';
import { useLineMetrics } from '../editor/useLineMetrics';
import { segundosRestantes, useAhora } from '../useAhora';
import { STATE_CLASS, STATE_HINT, type VisibleState } from '../processStates';

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
}

/** Margenes del texto dentro del area y del margen de numeros; iguales a index.css. */
const TEXT_PAD = 16;
const GUTTER_PAD_LEFT = 34;
const GUTTER_PAD_RIGHT = 12;
/** Aire entre el final del codigo y la primera etiqueta. */
const TAG_GAP = 14;
/** Chips que se ven encimados en el margen de un renglon; el resto esta en las etiquetas. */
const CHIPS_PER_LINE = 2;
const CHIP_STEP = 9;

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

/**
 * Editor del programa: un textarea transparente sobre el codigo coloreado. Mientras corre la
 * simulacion marca donde esta cada proceso sin tapar el texto: una franja lisa por renglon,
 * un chip con la inicial del proceso en el margen y una etiqueta al final del codigo que dice
 * quien es y que esta haciendo.
 */
export function CodeEditor({
  code, onChange, readOnly, activeLines, errorLines, pasoMs, fontSize,
}: Props) {
  // El chip llega enseguida al renglon y se queda ahi: si el deslizamiento ocupara casi todo
  // el instante, pasaria mas tiempo entre dos renglones que sobre el que se esta ejecutando.
  const slideMs = Math.min(Math.round(pasoMs * 0.45), 260);

  const layerRef = useRef<HTMLPreElement>(null);
  const metrics = useLineMetrics(layerRef);
  const lines = useMemo(() => code.split('\n'), [code]);
  const yOf = (line: number) => metrics.top + (line - 1) * metrics.lineHeight;

  const marks = useMemo(() => lineMarksOf(activeLines), [activeLines]);
  const chips = useMemo(() => gutterChipsOf(activeLines), [activeLines]);
  const now = useAhora(activeLines.some((a) => a.delayEndsAt !== null));

  const gutterWidth = GUTTER_PAD_LEFT + GUTTER_PAD_RIGHT
    + String(lines.length).length * metrics.charWidth;

  return (
    <div
      className="editor"
      style={{
        ['--desliz' as string]: `${slideMs}ms`,
        // el interlineado acompana a la letra; las marcas se miden del DOM, asi que siguen
        ['--line-h' as string]: `${Math.round(fontSize * 1.7)}px`,
        ['--gutter-w' as string]: `${Math.ceil(gutterWidth)}px`,
        fontSize,
      }}
    >
      <div className="doc">
        <div className="gutter">
          {lines.map((_, i) => `${i + 1}\n`).join('')}
          {/* Un chip POR PROCESO, no por renglon: al avanzar sobrevive el mismo nodo del DOM
              y la transicion de CSS lo desliza hasta el renglon nuevo. */}
          {chips.map((c) => (
            <span
              key={c.name}
              className={`gutter-chip ${STATE_CLASS[c.state]}${isRunning(c.state) ? ' activo' : ''}`}
              style={{
                top: yOf(c.line),
                height: metrics.lineHeight,
                left: 6 + Math.min(c.slot, CHIPS_PER_LINE - 1) * CHIP_STEP,
                opacity: c.slot < CHIPS_PER_LINE ? 1 : 0,
                zIndex: CHIPS_PER_LINE - c.slot,
                ['--st-proceso' as string]: c.color,
              }}
              aria-hidden="true"
            >
              <i>{c.name.charAt(0).toUpperCase()}</i>
            </span>
          ))}
        </div>
        <div className="area">
          <pre ref={layerRef} className="layer" dangerouslySetInnerHTML={{ __html: highlight(code) + '\n' }} />

          {marks.map((m) => (
            <div
              key={m.line}
              className={`line-band ${STATE_CLASS[m.state]}`}
              style={{ top: yOf(m.line), height: metrics.lineHeight, ['--st-proceso' as string]: m.color }}
            />
          ))}

          {errorLines.map((line) => (
            <div key={`error-${line}`} className="line-band line-error"
              style={{ top: yOf(line), height: metrics.lineHeight }} />
          ))}

          {marks.map((m) => (
            <div key={m.line} className="line-tags" style={{ top: yOf(m.line), height: metrics.lineHeight }}>
              <span
                className="line-tags-gap"
                style={{ flexBasis: TEXT_PAD + (lines[m.line - 1]?.length ?? 0) * metrics.charWidth + TAG_GAP }}
              />
              <span className="line-tags-list">
                {m.tags.map((t) => <Tag key={t.key} tag={t} now={now} />)}
                {m.hiddenNames.length > 0 && (
                  <span className="line-tag st-ready varios"
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
          />
        </div>
      </div>
    </div>
  );
}

/** Los primeros nombres de una lista, para un texto emergente. */
function listNames(names: readonly string[]): string {
  const MAX = 20;
  return names.slice(0, MAX).join(', ') + (names.length > MAX ? '…' : '');
}

/** Etiqueta al final de un renglon: quien esta ahi y que esta haciendo. */
function Tag({ tag, now }: { tag: LineTag; now: number }) {
  const Icon = STATE_ICON[tag.state];
  const several = tag.names.length > 1;
  const hint = `${several ? listNames(tag.names) : tag.title}: ${STATE_HINT[tag.state]}`;
  return (
    <span
      className={`line-tag ${STATE_CLASS[tag.state]}${several ? ' varios' : ''}`}
      style={{ ['--st-proceso' as string]: tag.color }}
      title={hint}
    >
      {Icon && <Icon size={11} strokeWidth={2.5} aria-hidden="true" />}
      {!isRunning(tag.state) && !several && <i className="line-tag-dot" />}
      <b>{tag.title}</b>
      {tag.detail && <span>· {tag.detail}</span>}
      {tag.delayEndsAt !== null && (
        <span className="delay-count">{segundosRestantes(tag.delayEndsAt, now)} s</span>
      )}
    </span>
  );
}
