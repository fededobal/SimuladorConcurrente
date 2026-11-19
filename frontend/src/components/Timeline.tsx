import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { InstantCard } from './InstantCard';
import { TimelineRow } from './TimelineRow';
import { prefersReducedMotion, slideMs, stepEasing } from '../motion';
import { STATE_CLASS, STATE_HINT, type VisibleState } from '../processStates';
import { familyOf, type Timeline as TimelineData } from '../timeline';
import { BOTTOM_PAD, ROW_H, RULER_H, visibleRows } from '../timelineLayout';
import type { ProcessView } from '../types';
import s from './Timeline.module.css';

interface Props {
  readonly timeline: TimelineData;
  /** Procesos del snapshot actual: de aca salen el nombre y el color de cada fila. */
  readonly processes: readonly ProcessView[];
  /** Instante del deadlock, para marcarlo; null si no hubo. */
  readonly deadlockInstant: number | null;
  /**
   * Pedido de mostrar un instante: la linea de tiempo se desplaza hasta el y deja fija su
   * tarjeta. `nonce` cambia en cada pedido, para poder repetir el mismo instante.
   */
  readonly focus: { readonly instant: number; readonly nonce: number } | null;
  /** Duracion de un instante, en ms: el deslizamiento se acompasa a la simulacion. */
  readonly pasoMs: number;
  /** true si esta ampliada: al costado del editor y a toda altura. */
  readonly expanded: boolean;
  readonly onToggleExpand: () => void;
}

// Medidas de la grilla, en px. Posicionan filas y tramos (que son absolutos) y viajan al CSS
// como variables, asi no hay dos copias que se puedan desalinear.
const NAME_W = 156;
/** Anchos de columna que recorre el zoom; el del medio es el de arranque. */
const CELL_WIDTHS = [12, 18, 26, 36, 50] as const;
const DEFAULT_CELL = 2;
const CARD_W = 320;
/** Cada cuantos instantes se rotula la regla. */
const RULER_EVERY = 5;

/** Estados de la leyenda (el terminado es la ausencia de barra), con su nombre corto. */
const LEGEND: readonly [VisibleState, string][] = [
  ['RUNNING_PROCESS', 'en el proceso'],
  ['RUNNING_MONITOR', 'en el monitor'],
  ['COMPETING', 'compite'],
  ['WAITING', 'dormido'],
  ['DELAYED', 'en delay'],
  ['READY', 'sin turno'],
];

/** Una fila de la grilla: el carril de un monitor o un proceso. */
type Row = { readonly kind: 'monitor'; readonly name: string } | { readonly kind: 'process'; readonly id: number };

/**
 * Linea de tiempo: una fila por proceso y una columna por instante, con el estado en que
 * quedo cada proceso. Arriba, un carril por monitor con quien lo tuvo en cada instante. Las
 * filas no se mueven, asi se puede seguir a un proceso de punta a punta; al pasar el mouse
 * por una columna, una tarjeta cuenta en palabras que paso en ese instante, y un clic la
 * deja fija. Solo se dibujan las filas que se ven: con mil procesos son las mismas veinte.
 * El boton de la cabecera la amplia: pasa al costado del editor, a toda altura.
 *
 * De un instante al siguiente nada salta: el tramo que sigue se alarga, el que empieza se
 * descubre desde su borde izquierdo, el cursor del instante actual se corre una columna y el
 * desplazamiento lo acompana. Solo se anima el paso de un instante al que le sigue; un cambio
 * de zoom o una ejecucion nueva se muestran de una vez.
 */
export function Timeline({
  timeline, processes, deadlockInstant, focus, pasoMs, expanded, onToggleExpand,
}: Props) {
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

  // Solo el paso de un instante al que le sigue se anima. Se compara con lo que se dibujo la
  // vez anterior: si cambio el zoom, o los instantes no son consecutivos (ejecucion nueva),
  // todo va a su lugar sin transicion.
  const lastInstant = columns[columns.length - 1]?.instant ?? 0;
  const [drawn, setDrawn] = useState({ lastInstant, cell });
  const [gliding, setGliding] = useState(false);
  if (drawn.lastInstant !== lastInstant || drawn.cell !== cell) {
    setDrawn({ lastInstant, cell });
    setGliding(drawn.cell === cell && lastInstant === drawn.lastInstant + 1);
  }
  const slide = slideMs(pasoMs);

  // Seguir el ultimo instante, como la salida; salvo que el alumno se haya ido hacia atras
  // para mirar un instante viejo. El desplazamiento se anima a mano (scrollLeft no admite
  // transiciones de CSS), con la misma duracion y curva que el cursor y los tramos.
  const following = useRef(true);
  const glide = useRef<number | null>(null);
  const stopGlide = useCallback(() => {
    if (glide.current !== null) cancelAnimationFrame(glide.current);
    glide.current = null;
  }, []);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !following.current) return;
    stopGlide();
    const from = el.scrollLeft;
    const distance = el.scrollWidth - el.clientWidth - from;
    // sin animacion si no corresponde, o si quedo tan atras que deslizarse marearia
    if (!gliding || slide === 0 || distance <= 0 || distance > cell * 4 || prefersReducedMotion()) {
      el.scrollLeft = el.scrollWidth;
      return;
    }
    const start = performance.now();
    const frameStep = (now: number) => {
      const t = Math.min(1, (now - start) / slide);
      el.scrollLeft = from + distance * stepEasing(t);
      glide.current = t < 1 ? requestAnimationFrame(frameStep) : null;
    };
    glide.current = requestAnimationFrame(frameStep);
    // `gliding` y `slide` se leen del mismo render que cambio las columnas: no son disparadores
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns.length, lastInstant, cell, stopGlide]);
  useEffect(() => stopGlide, [stopGlide]);
  const onScroll = () => {
    const el = scrollRef.current;
    // mientras se desliza sola todavia no llego al final: no cuenta como "se fue hacia atras"
    if (el && glide.current === null) {
      following.current = el.scrollLeft + el.clientWidth >= el.scrollWidth - cell;
    }
    readView();
  };

  // Una simulacion nueva empieza sin columna fijada.
  useEffect(() => {
    if (columns.length === 0) setPinned(null);
  }, [columns.length]);

  // Pedido de afuera ("ver el instante del deadlock"): fijar su tarjeta y traerlo a la vista.
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
          <button type="button" className="btn btn-icono btn-plano btn-chico" onClick={onToggleExpand}
            aria-pressed={expanded}
            aria-label={expanded ? 'Volver la línea de tiempo a su lugar' : 'Ampliar la línea de tiempo'}
            title={expanded ? 'Volver la línea de tiempo a su lugar (Esc)' : 'Ampliar la línea de tiempo'}>
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </header>

      {/* si el alumno toma el desplazamiento (rueda, barra o dedo), deja de moverse sola */}
      <div className={s.scroll} ref={scrollRef} onScroll={onScroll}
        onWheel={stopGlide} onPointerDown={stopGlide} onTouchStart={stopGlide}>
        {columns.length === 0 && (
          <p className={s.emptyText}>Con Ejecutar o Paso, acá se dibuja cómo avanza cada proceso instante a instante.</p>
        )}
        <div
          className={`${s.plane}${gliding ? '' : ` ${s.still}`}`}
          style={{
            width, height, ['--desliz' as string]: `${slide}ms`,
            ['--cell' as string]: `${cell}px`, ['--row-h' as string]: `${ROW_H}px`,
            ['--ruler-h' as string]: `${RULER_H}px`, ['--name-w' as string]: `${NAME_W}px`,
          }}
          onMouseMove={(e) => setHover(columnAt(e))}
          onMouseLeave={() => setHover(null)}
          onClick={(e) => { const i = columnAt(e); setPinned((p) => (i === null || p === i ? null : i)); }}
        >
          <div className={s.ruler}>
            <div className={s.corner}>Instante</div>
            {columns.map((c, i) => (c.instant % RULER_EVERY === 0 || c.instant === 1) && i !== last && (
              <span key={c.instant} className={s.tick} style={{ left: NAME_W + i * cell }}>
                <span>{c.instant}</span>
              </span>
            ))}
            {/* el instante actual: un solo nodo que se corre de columna, no uno nuevo por instante */}
            {last >= 0 && (
              <span className={`${s.tick} ${s.now}`} style={{ left: NAME_W + last * cell }}>
                <span>{columns[last].instant}</span>
              </span>
            )}
          </div>

          {last >= 0 && <div className={s.cursor} style={{ left: NAME_W + last * cell, top: RULER_H }} />}
          {deadlockColumn >= 0 && (
            <div className={s.deadlock} style={{ left: NAME_W + (deadlockColumn + 1) * cell }}>
              <span>Deadlock: nadie puede avanzar</span>
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
                <TimelineRow key={`m-${row.name}`} kind="monitor" name={row.name} top={top} cell={cell}
                  nameWidth={NAME_W} columns={columns} byId={byId} last={index === monitors.length - 1} />
              );
            }
            const p = byId.get(row.id);
            if (!p) return null;
            const next = rows[index + 1];
            const nextProc = next?.kind === 'process' ? byId.get(next.id) : undefined;
            const cut = nextProc !== undefined && familyOf(nextProc.name) !== familyOf(p.name);
            return (
              <TimelineRow key={row.id} kind="process" process={p} top={top} cell={cell}
                nameWidth={NAME_W} columns={columns} cut={cut} />
            );
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
