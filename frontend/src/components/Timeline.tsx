import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { STATE_CLASS, STATE_HINT, type VisibleState } from '../processStates';
import { processTextColor } from '../processColor';
import { familyOf, type Timeline as TimelineData, type TimelineColumn } from '../timeline';
import {
  BOTTOM_PAD, labelsOf, ownerSegmentsOf, ROW_H, RULER_H, segmentsOf, visibleRows,
} from '../timelineLayout';
import type { LogEntry, ProcessView } from '../types';
import s from './Timeline.module.css';

interface Props {
  readonly timeline: TimelineData;
  /** Procesos del snapshot actual: de aca salen el nombre y el color de cada fila. */
  readonly processes: readonly ProcessView[];
  /** Instante del interbloqueo, para marcarlo; null si no hubo. */
  readonly deadlockInstant: number | null;
  /**
   * Pedido de mostrar un instante: la linea de tiempo se desplaza hasta el y deja fija su
   * tarjeta. `nonce` cambia en cada pedido, para poder repetir el mismo instante.
   */
  readonly focus: { readonly instant: number; readonly nonce: number } | null;
}

// Medidas de la grilla, en px. Posicionan filas y tramos (que son absolutos) y viajan al CSS
// como variables, asi no hay dos copias que se puedan desalinear.
const NAME_W = 156;
/** Anchos de columna que recorre el zoom; el del medio es el de arranque. */
const CELL_WIDTHS = [12, 18, 26, 36, 50] as const;
const DEFAULT_CELL = 2;
/** Tipografia de los rotulos de los tramos; igual a .seg en el modulo CSS. */
const LABEL_FONT = "600 12px 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
/** Margen interno de un tramo a cada lado del rotulo, con su borde. */
const LABEL_PAD = 7;
/** Ancho aproximado de un caracter, por si no hay canvas para medir. */
const CHAR_W = 6.8;
const CARD_W = 320;
/** Cada cuantos instantes se rotula la regla. */
const RULER_EVERY = 5;
const MAX_EVENTS = 6;

/** Estados de la leyenda (el terminado es la ausencia de barra), con su nombre corto. */
const LEGEND: readonly [VisibleState, string][] = [
  ['RUNNING_PROCESS', 'en el proceso'],
  ['RUNNING_MONITOR', 'en el monitor'],
  ['COMPETING', 'compite'],
  ['WAITING', 'en wait'],
  ['DELAYED', 'en delay'],
  ['READY', 'sin turno'],
];

// Se mide el texto de verdad en vez de estimarlo: una estimacion con margen descartaba
// rotulos que entraban.
let ruler: CanvasRenderingContext2D | null | undefined;
function textWidth(text: string): number {
  if (ruler === undefined) ruler = document.createElement('canvas').getContext('2d');
  if (!ruler) return text.length * CHAR_W;
  ruler.font = LABEL_FONT;
  return ruler.measureText(text).width;
}

/** El primer rotulo que entra en un tramo de ese ancho, o vacio si no entra ninguno. */
function labelThatFits(labels: readonly string[], width: number): string {
  return labels.find((l) => width >= textWidth(l) + 2 * LABEL_PAD) ?? '';
}

/** Una fila de la grilla: el carril de un monitor o un proceso. */
type Row = { readonly kind: 'monitor'; readonly name: string } | { readonly kind: 'process'; readonly id: number };

/**
 * Linea de tiempo: una fila por proceso y una columna por instante, con el estado en que
 * quedo cada proceso. Arriba, un carril por monitor con quien lo tuvo en cada instante. Las
 * filas no se mueven, asi se puede seguir a un proceso de punta a punta; al pasar el mouse
 * por una columna, una tarjeta cuenta en palabras que paso en ese instante, y un clic la
 * deja fija. Solo se dibujan las filas que se ven: con mil procesos son las mismas veinte.
 */
export function Timeline({ timeline, processes, deadlockInstant, focus }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { columns, order, monitors } = timeline;
  const [cellIndex, setCellIndex] = useState(DEFAULT_CELL);
  const cell = CELL_WIDTHS[cellIndex];
  // columna bajo el mouse y columna fijada con un clic: la tarjeta muestra la fijada si hay
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);

  const byId = useMemo(() => new Map(processes.map((p) => [p.id, p])), [processes]);
  const rows = useMemo<Row[]>(() => [
    ...monitors.map((name): Row => ({ kind: 'monitor', name })),
    ...order.map((id): Row => ({ kind: 'process', id })),
  ], [monitors, order]);

  // Desplazamiento vertical, para dibujar solo las filas visibles. Se lee a lo sumo una vez
  // por cuadro.
  const [view, setView] = useState({ top: 0, height: 0 });
  const frame = useRef<number | null>(null);
  const readView = useCallback(() => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const el = scrollRef.current;
      if (!el) return;
      setView((prev) => (prev.top === el.scrollTop && prev.height === el.clientHeight
        ? prev : { top: el.scrollTop, height: el.clientHeight }));
    });
  }, []);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    readView();
    const observer = new ResizeObserver(readView);
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [readView]);
  const range = visibleRows(Math.max(0, view.top - RULER_H), view.height, ROW_H, rows.length);

  // Seguir el ultimo instante, como la salida; salvo que el alumno se haya ido hacia atras
  // para mirar un instante viejo.
  const following = useRef(true);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && following.current) el.scrollLeft = el.scrollWidth;
  }, [columns.length, cell]);
  const onScroll = () => {
    const el = scrollRef.current;
    if (el) following.current = el.scrollLeft + el.clientWidth >= el.scrollWidth - cell;
    readView();
  };

  // Una simulacion nueva empieza sin columna fijada.
  useEffect(() => {
    if (columns.length === 0) setPinned(null);
  }, [columns.length]);

  // Pedido de afuera ("ver el instante del interbloqueo"): fijar su tarjeta y traerlo a la vista.
  useEffect(() => {
    if (!focus) return;
    const i = columns.findIndex((c) => c.instant === focus.instant);
    if (i < 0) return;
    setPinned(i);
    following.current = false;
    const el = scrollRef.current;
    if (el) el.scrollLeft = Math.max(0, NAME_W + (i + 1) * cell - el.clientWidth + cell * 3);
    // solo ante un pedido nuevo: no debe volver a ese instante cada vez que se agrega una columna
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  const deadlockColumn = deadlockInstant === null ? -1
    : columns.findIndex((c) => c.instant === deadlockInstant);

  const columnAt = (e: React.MouseEvent<HTMLDivElement>): number | null => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - rect.left - NAME_W) / cell);
    return i >= 0 && i < columns.length ? i : null;
  };

  const width = NAME_W + Math.max(columns.length, 1) * cell + cell * 2;
  const height = RULER_H + rows.length * ROW_H + BOTTOM_PAD;
  const shown = pinned ?? hover;
  // la tarjeta va a la derecha de la columna; si no entra en lo visible, a la izquierda
  const visibleRight = (scrollRef.current?.scrollLeft ?? 0) + (scrollRef.current?.clientWidth ?? width);
  const cardLeft = shown === null ? 0
    : NAME_W + (shown + 1) * cell + 8 + CARD_W > visibleRight
      ? Math.max(NAME_W, NAME_W + shown * cell - CARD_W - 8)
      : NAME_W + (shown + 1) * cell + 8;
  const last = columns.length - 1;

  return (
    <section className={s.timeline} aria-label="Línea de tiempo">
      <header className={s.head}>
        <span className={s.title}>Línea de tiempo</span>
        <ul className={s.legend}>
          {LEGEND.map(([state, label]) => (
            <li key={state} title={STATE_HINT[state]}>
              <span className={`${s.sample} ${STATE_CLASS[state]}`} />
              {label}
            </li>
          ))}
        </ul>
        <div className={s.end}>
          <span className={s.hint}>Clic en un instante para ver qué pasó</span>
          <button type="button" className="btn btn-icono btn-plano btn-chico"
            onClick={() => setCellIndex((i) => Math.max(0, i - 1))} disabled={cellIndex === 0}
            aria-label="Ver más instantes" title="Ver más instantes">
            <ZoomOut size={14} />
          </button>
          <button type="button" className="btn btn-icono btn-plano btn-chico"
            onClick={() => setCellIndex((i) => Math.min(CELL_WIDTHS.length - 1, i + 1))}
            disabled={cellIndex === CELL_WIDTHS.length - 1}
            aria-label="Ver menos instantes, más grandes" title="Ver menos instantes, más grandes">
            <ZoomIn size={14} />
          </button>
        </div>
      </header>

      <div className={s.scroll} ref={scrollRef} onScroll={onScroll}>
        {columns.length === 0 && (
          <p className={s.emptyText}>Con Ejecutar o Paso, acá se dibuja cómo avanza cada proceso instante a instante.</p>
        )}
        <div
          className={s.plane}
          style={{
            width, height,
            ['--cell' as string]: `${cell}px`, ['--row-h' as string]: `${ROW_H}px`,
            ['--ruler-h' as string]: `${RULER_H}px`, ['--name-w' as string]: `${NAME_W}px`,
          }}
          onMouseMove={(e) => setHover(columnAt(e))}
          onMouseLeave={() => setHover(null)}
          onClick={(e) => { const i = columnAt(e); setPinned((p) => (i === null || p === i ? null : i)); }}
        >
          <div className={s.ruler}>
            <div className={s.corner}>Instante</div>
            {columns.map((c, i) => (c.instant % RULER_EVERY === 0 || c.instant === 1 || i === last) && (
              <span key={c.instant} className={`${s.tick}${i === last ? ` ${s.now}` : ''}`}
                style={{ left: NAME_W + i * cell }}>
                <span>{c.instant}</span>
              </span>
            ))}
          </div>

          {last >= 0 && <div className={s.cursor} style={{ left: NAME_W + last * cell, top: RULER_H }} />}
          {deadlockColumn >= 0 && (
            <div className={s.deadlock} style={{ left: NAME_W + (deadlockColumn + 1) * cell }}>
              <span>Interbloqueo: nadie puede avanzar</span>
            </div>
          )}
          {shown !== null && (
            <div className={`${s.column}${pinned !== null ? ` ${s.pinned}` : ''}`}
              style={{ left: NAME_W + shown * cell, top: RULER_H }} />
          )}

          {rows.slice(range.first, range.end).map((row, k) => {
            const index = range.first + k;
            const top = RULER_H + index * ROW_H;
            if (row.kind === 'monitor') {
              return (
                <MonitorLane key={`m-${row.name}`} name={row.name} top={top} cell={cell}
                  columns={columns} byId={byId} last={index === monitors.length - 1} />
              );
            }
            const p = byId.get(row.id);
            if (!p) return null;
            const next = rows[index + 1];
            const nextProc = next?.kind === 'process' ? byId.get(next.id) : undefined;
            const cut = nextProc !== undefined && familyOf(nextProc.name) !== familyOf(p.name);
            return <ProcessRow key={row.id} process={p} top={top} cell={cell} columns={columns} cut={cut} />;
          })}

          {shown !== null && columns[shown] && (
            <InstantCard column={columns[shown]} left={cardLeft}
              top={RULER_H + 6 + Math.max(0, view.top - RULER_H)} />
          )}
        </div>
      </div>
    </section>
  );
}

interface LaneProps {
  readonly name: string;
  readonly top: number;
  readonly cell: number;
  readonly columns: readonly TimelineColumn[];
  readonly byId: ReadonlyMap<number, ProcessView>;
  /** true si es el ultimo carril: lleva el borde que lo separa de los procesos. */
  readonly last: boolean;
}

/** Carril de un monitor: quien lo tuvo en cada instante, o "libre". */
function MonitorLane({ name, top, cell, columns, byId, last }: LaneProps) {
  return (
    <div className={`${s.row} ${s.lane}${last ? ` ${s.laneLast}` : ''}`} style={{ top }}
      title={`${name}: quién tiene el monitor en cada instante`}>
      <div className={s.name}>
        <span className={s.nameText}>{name}</span>
        <span className={s.tag}>monitor</span>
      </div>
      {ownerSegmentsOf(name, columns).map((seg) => {
        const owner = seg.owner === null ? undefined : byId.get(seg.owner);
        const width = seg.length * cell - 2;
        return (
          <div
            key={seg.from}
            className={`${s.seg} ${owner ? s.owner : s.free}`}
            style={{ left: NAME_W + seg.from * cell + 1, width, background: owner?.color }}
            title={owner ? `${owner.name} tiene ${name}` : `${name} libre`}
          >
            {labelThatFits(owner ? [owner.name] : ['libre'], width)}
          </div>
        );
      })}
    </div>
  );
}

interface RowProps {
  readonly process: ProcessView;
  readonly top: number;
  readonly cell: number;
  readonly columns: readonly TimelineColumn[];
  /** true si la fila siguiente es de otra familia de procesos. */
  readonly cut: boolean;
}

/** Fila de un proceso: un tramo por cada racha de instantes en el mismo estado y lugar. */
function ProcessRow({ process: p, top, cell, columns, cut }: RowProps) {
  const state = columns[columns.length - 1]?.states[p.id];
  return (
    <div className={`${s.row}${cut ? ` ${s.cut}` : ''}`}
      style={{ top, ['--st-proceso' as string]: p.color }}
      title={state ? `${p.name}: ${STATE_HINT[state]}` : p.name}>
      <div className={s.name} style={{ color: processTextColor(p.color) }}>
        <i className="punto" style={{ background: p.color }} />
        <span className={s.nameText}>{p.name}</span>
      </div>
      {segmentsOf(p.id, columns).map((seg) => {
        const width = seg.length * cell - 2;
        const labels = labelsOf(seg);
        return (
          <div
            key={seg.from}
            className={`${s.seg} ${STATE_CLASS[seg.state]}`}
            style={{ left: NAME_W + seg.from * cell + 1, width }}
            title={labels[0]}
          >
            {labelThatFits(labels, width)}
          </div>
        );
      })}
    </div>
  );
}

/** Lo que paso en un instante, en palabras: los eventos del paso, con el proceso en su color. */
function InstantCard({ column, left, top }: { column: TimelineColumn; left: number; top: number }) {
  const events = column.events;
  const shown = events.slice(0, MAX_EVENTS);
  return (
    <div className={s.card} style={{ left, top }} role="status">
      <b>Instante {column.instant}</b>
      {events.length === 0 && <div className={s.nobody}>Nadie avanzó en este instante.</div>}
      {shown.map((e) => <EventLine key={e.id} e={e} />)}
      {events.length > shown.length && (
        <div className={s.nobody}>… y {events.length - shown.length} más</div>
      )}
    </div>
  );
}

/** Un evento del log, "Nombre: texto": el nombre con el color del proceso. */
function EventLine({ e }: { e: LogEntry }) {
  const i = e.message.indexOf(': ');
  if (e.processId === null || i < 0) return <div>{e.message}</div>;
  return (
    <div>
      <span className={s.who} style={{ color: e.processColor ? processTextColor(e.processColor) : undefined }}>
        {e.message.slice(0, i)}
      </span>
      {' '}{e.message.slice(i + 2)}
    </div>
  );
}
