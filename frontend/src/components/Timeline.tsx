import { useLayoutEffect, useMemo, useRef } from 'react';
import { ExpandButton } from './ExpandButton';
import { STATE_CLASS, STATE_HINT, STATE_LABEL, type VisibleState } from '../processStates';
import type { Timeline as TimelineData } from '../timeline';
import type { ProcessView } from '../types';

interface Props {
  timeline: TimelineData;
  /** Procesos del snapshot actual: de aca salen el nombre y el color de cada fila. */
  processes: readonly ProcessView[];
  expanded: boolean;
  onToggleExpand: () => void;
}

// Iguales a --tl-* de index.css: posicionan las filas y los tramos, que son absolutos.
const CELL_W = 16;
const ROW_H = 22;
const RULER_H = 18;
const NAME_W = 120;
/** Aire debajo de la ultima fila, para que no quede pegada al borde de la ventana. */
const BOTTOM_PAD = 14;

/** Cada cuantos instantes se rotula la regla. */
const RULER_EVERY = 5;

/** Estados que aparecen en la leyenda (el terminado es la ausencia de barra). */
const LEGEND: readonly VisibleState[] = [
  'RUNNING_PROCESS', 'RUNNING_MONITOR', 'COMPETING', 'WAITING', 'DELAYED', 'READY',
];

/** Una "M" por instante: el tramo junta varios instantes, pero cada uno fue en el monitor. */
const monitorMarks = (n: number) =>
  Array.from({ length: n }, (_, i) => <span key={i} className="tl-m">M</span>);

/** Tramo de instantes seguidos en el mismo estado: se dibuja como una sola barra. */
interface Segment {
  state: VisibleState;
  from: number;
  length: number;
}

function segmentsOf(id: number, timeline: TimelineData): Segment[] {
  const out: Segment[] = [];
  timeline.columns.forEach((col, i) => {
    const state = col.states[id];
    if (state === undefined || state === 'TERMINATED') return;
    const prev = out[out.length - 1];
    if (prev && prev.state === state && prev.from + prev.length === i) prev.length++;
    else out.push({ state, from: i, length: 1 });
  });
  return out;
}

/**
 * Linea de tiempo: una fila por proceso y una columna por instante, con el estado en que
 * quedo cada proceso. Las filas se reordenan en cada instante (los que avanzaron suben) y
 * se deslizan a su lugar nuevo en vez de saltar, para que se pueda seguir a cada proceso.
 */
export function Timeline({ timeline, processes, expanded, onToggleExpand }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { columns, order } = timeline;

  const byId = useMemo(() => new Map(processes.map((p) => [p.id, p])), [processes]);
  const segments = useMemo(
    () => new Map(order.map((id) => [id, segmentsOf(id, timeline)])),
    [order, timeline],
  );

  // Seguir el ultimo instante, como la salida; salvo que el alumno se haya ido hacia atras
  // para mirar un instante viejo.
  const siguiendo = useRef(true);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && siguiendo.current) el.scrollLeft = el.scrollWidth;
  }, [columns.length]);
  const onScroll = () => {
    const el = scrollRef.current;
    if (el) siguiendo.current = el.scrollLeft + el.clientWidth >= el.scrollWidth - CELL_W;
  };

  const ancho = NAME_W + Math.max(columns.length, 1) * CELL_W + CELL_W;
  const alto = RULER_H + order.length * ROW_H + BOTTOM_PAD;

  return (
    <section className="timeline tarjeta" aria-label="Línea de tiempo">
      <header className="panel-head">
        <span className="titulo">Línea de tiempo</span>
        <ul className="tl-leyenda">
          {LEGEND.map((s) => (
            <li key={s} title={STATE_HINT[s]}>
              <span className={`tl-muestra ${STATE_CLASS[s]}`}>
                {s === 'RUNNING_MONITOR' && 'M'}
              </span>
              {STATE_LABEL[s]}
            </li>
          ))}
        </ul>
        <ExpandButton expanded={expanded} onClick={onToggleExpand} />
      </header>

      <div className="tl-scroll" ref={scrollRef} onScroll={onScroll}>
        <div className="tl-plano" style={{ width: ancho, height: alto }}>
          <div className="tl-regla">
            <div className="tl-esquina">instante</div>
            {columns.map((c, i) => (c.instant % RULER_EVERY === 0 || i === columns.length - 1) && (
              <span
                key={c.instant}
                className={i === columns.length - 1 ? 'actual' : undefined}
                style={{ left: NAME_W + i * CELL_W }}
              >
                {c.instant}
              </span>
            ))}
          </div>

          {columns.length > 0 && (
            <div
              className="tl-cursor"
              style={{ left: NAME_W + (columns.length - 1) * CELL_W, top: RULER_H }}
            />
          )}

          {order.map((id, fila) => {
            const p = byId.get(id);
            if (!p) return null;
            const ultimo = columns[columns.length - 1]?.states[id];
            return (
              <div
                key={id}
                className="tl-fila"
                style={{ top: RULER_H + fila * ROW_H, ['--st-proceso' as string]: p.color }}
                title={ultimo ? `${p.name}: ${STATE_HINT[ultimo]}` : p.name}
              >
                <div className="tl-nombre" style={{ color: p.color }}>{p.name}</div>
                {segments.get(id)?.map((s) => (
                  <div
                    key={s.from}
                    className={`tl-tramo ${STATE_CLASS[s.state]}`}
                    style={{ left: NAME_W + s.from * CELL_W, width: s.length * CELL_W }}
                  >
                    {s.state === 'RUNNING_MONITOR' && monitorMarks(s.length)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
