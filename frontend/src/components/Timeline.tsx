import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { InstantCard } from './InstantCard';
import { TimelineRow } from './TimelineRow';
import { textWidth } from '../measureText';
import { prefersReducedMotion, slideMs, stepEasing } from '../motion';
import { STATE_CLASS, STATE_HINT, type VisibleState } from '../processStates';
import { familyOf, type Timeline as TimelineData } from '../timeline';
import {
  BOTTOM_PAD, NAME_W_AUTO_MAX, NAME_W_DEFAULT, ROW_H, RULER_H, visibleRows, type Point,
} from '../timelineLayout';
import type { ProcessView } from '../types';
import { useNameColumn } from '../useNameColumn';
import s from './Timeline.module.css';

interface Props {
  readonly timeline: TimelineData;
  /** Procesos del snapshot actual: de aca salen el nombre y el color de cada fila. */
  readonly processes: readonly ProcessView[];
  /** Instante del deadlock, para marcarlo; null si no hubo. */
  readonly deadlockInstant: number | null;
  /**
   * Pedido de mostrar un instante: la linea de tiempo se desplaza hasta el y muestra su
   * cartel. `nonce` cambia en cada pedido, para poder repetir el mismo instante.
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
/** Anchos de columna que recorre el zoom; el del medio es el de arranque. */
const CELL_WIDTHS = [12, 18, 26, 36, 50] as const;
const DEFAULT_CELL = 2;
/** Tipografia de los nombres de las filas; igual a .name en el modulo CSS. */
const NAME_FONT = "600 12px ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace";
/** Lo que ocupa una fila ademas del nombre: margenes y el punto de color o la etiqueta "monitor". */
const PROCESS_EXTRA = 12 + 8 + 7 + 12 + 4;
const MONITOR_EXTRA = 12 + 7 + 60 + 12 + 4;
/** Lugar que ocupa el rotulo del deadlock a la derecha de su raya, en px. */
const DEADLOCK_LABEL_W = 230;
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

/** El texto mas largo de la lista. */
function longest(names: readonly string[]): string {
  return names.reduce((a, b) => (b.length > a.length ? b : a), '');
}

/** Un instante elegido con un clic: su columna y donde estaba el puntero. */
interface Pinned {
  readonly index: number;
  readonly at: Point;
}

/** Una fila de la grilla: el carril de un monitor o un proceso. */
type Row = { readonly kind: 'monitor'; readonly name: string } | { readonly kind: 'process'; readonly id: number };

/**
 * Linea de tiempo: una fila por proceso y una columna por instante, con el estado en que
 * quedo cada proceso. Arriba, un carril por monitor con quien lo tuvo en cada instante. Las
 * filas no se mueven, asi se puede seguir a un proceso de punta a punta. Un clic en un
 * instante muestra un cartel que cuenta en palabras que paso; el cartel acompana al puntero
 * para no tapar lo que se mira, y se cierra con otro clic en el mismo instante o con Escape.
 * La columna de nombres se ensancha arrastrando su borde derecho. Solo se dibujan las filas
 * que se ven: con mil procesos son las mismas veinte. El boton de la cabecera la amplia: pasa
 * al costado del editor, a toda altura.
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
  // la grilla, como estado y no como ref: el cartel se suscribe a sus movimientos del mouse
  const [plane, setPlane] = useState<HTMLDivElement | null>(null);
  const { columns, order, monitors } = timeline;
  const [cellIndex, setCellIndex] = useState(DEFAULT_CELL);
  const cell = CELL_WIDTHS[cellIndex];
  // columna bajo el mouse (solo se resalta) e instante elegido con un clic (muestra su cartel)
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<Pinned | null>(null);

  const byId = useMemo(() => new Map(processes.map((p) => [p.id, p])), [processes]);
  const rows = useMemo<Row[]>(() => [
    ...monitors.map((name): Row => ({ kind: 'monitor', name })),
    ...order.map((id): Row => ({ kind: 'process', id })),
  ], [monitors, order]);

  // Desplazamiento vertical y tamano visible, para dibujar solo las filas que se ven y para
  // limitar la columna de nombres. Se lee a lo sumo una vez por cuadro.
  const [view, setView] = useState({ top: 0, height: 0, width: 0 });
  const frame = useRef<number | null>(null);
  const readView = useCallback(() => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const el = scrollRef.current;
      if (!el) return;
      setView((prev) => (prev.top === el.scrollTop && prev.height === el.clientHeight && prev.width === el.clientWidth
        ? prev : { top: el.scrollTop, height: el.clientHeight, width: el.clientWidth }));
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

  // Columna de nombres: de entrada, el ancho que necesita el nombre mas largo (la letra es
  // de ancho fijo, asi que alcanza con medir el que tiene mas caracteres).
  const longestProcess = useMemo(() => longest(processes.map((p) => p.name)), [processes]);
  const longestMonitor = useMemo(() => longest(monitors), [monitors]);
  const autoNameW = useMemo(() => Math.min(NAME_W_AUTO_MAX, Math.max(
    NAME_W_DEFAULT,
    longestProcess === '' ? 0 : Math.ceil(textWidth(longestProcess, NAME_FONT)) + PROCESS_EXTRA,
    longestMonitor === '' ? 0 : Math.ceil(textWidth(longestMonitor, NAME_FONT)) + MONITOR_EXTRA,
  )), [longestProcess, longestMonitor]);
  // el ancho automatico no se lleva mas de un 40 % del panel: en una ventana angosta, los
  // nombres largos se abrevian y el resto es para los instantes
  const autoShare = view.width > 0 ? Math.max(NAME_W_DEFAULT, Math.round(view.width * 0.4)) : autoNameW;
  const nameColumn = useNameColumn(Math.min(autoNameW, autoShare), view.width);
  const nameW = nameColumn.width;

  // Solo el paso de un instante al que le sigue se anima. Se compara con lo que se dibujo la
  // vez anterior: si cambio el zoom o el ancho de los nombres, o los instantes no son
  // consecutivos (ejecucion nueva), todo va a su lugar sin transicion.
  const lastInstant = columns[columns.length - 1]?.instant ?? 0;
  const [drawn, setDrawn] = useState({ lastInstant, cell, nameW });
  const [gliding, setGliding] = useState(false);
  if (drawn.lastInstant !== lastInstant || drawn.cell !== cell || drawn.nameW !== nameW) {
    setDrawn({ lastInstant, cell, nameW });
    setGliding(drawn.cell === cell && drawn.nameW === nameW && lastInstant === drawn.lastInstant + 1);
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

  // Una simulacion nueva empieza sin instante elegido.
  useEffect(() => {
    if (columns.length === 0) setPinned(null);
  }, [columns.length]);

  // Escape cierra el cartel. Se atiende antes que el Escape de la pantalla, que vuelve la
  // linea de tiempo ampliada a su lugar: primero se cierra el cartel.
  const hasPinned = pinned !== null;
  useEffect(() => {
    if (!hasPinned) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setPinned(null);
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [hasPinned]);

  // Pedido de afuera ("ver el instante del deadlock"): traerlo a la vista y mostrar su
  // cartel, que al no haber un clic va al lado de la columna.
  useEffect(() => {
    if (!focus) return;
    const i = columns.findIndex((c) => c.instant === focus.instant);
    if (i < 0) return;
    following.current = false;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, nameW + (i + 1) * cell - el.clientWidth + cell * 3);
    const box = el.getBoundingClientRect();
    setPinned({
      index: i,
      at: { x: box.left + nameW + (i + 1) * cell - el.scrollLeft, y: box.top + RULER_H },
    });
    // solo ante un pedido nuevo: no debe volver a ese instante cada vez que se agrega una columna
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  const deadlockColumn = deadlockInstant === null ? -1
    : columns.findIndex((c) => c.instant === deadlockInstant);

  const columnAt = (e: React.MouseEvent<HTMLDivElement>): number | null => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - rect.left - nameW) / cell);
    return i >= 0 && i < columns.length ? i : null;
  };

  // a la derecha del ultimo instante quedan dos columnas de aire, o el rotulo del deadlock
  const width = nameW + Math.max(columns.length, 1) * cell
    + (deadlockColumn >= 0 ? Math.max(cell * 2, DEADLOCK_LABEL_W) : cell * 2);
  const height = RULER_H + rows.length * ROW_H + BOTTOM_PAD;
  const pinnedColumn = pinned === null ? undefined : columns[pinned.index];
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
          ref={setPlane}
          className={`${s.plane}${gliding ? '' : ` ${s.still}`}`}
          style={{
            width, height, ['--desliz' as string]: `${slide}ms`,
            ['--cell' as string]: `${cell}px`, ['--row-h' as string]: `${ROW_H}px`,
            ['--ruler-h' as string]: `${RULER_H}px`, ['--name-w' as string]: `${nameW}px`,
          }}
          onMouseMove={(e) => setHover(columnAt(e))}
          onMouseLeave={() => setHover(null)}
          onClick={(e) => {
            const i = columnAt(e);
            const at = { x: e.clientX, y: e.clientY };
            setPinned((p) => (i === null || p?.index === i ? null : { index: i, at }));
          }}
        >
          {/* Asa de la columna de nombres: una franja sobre su borde derecho, de todo el alto
              visible. Va en una caja sin alto que se queda arriba a la izquierda al desplazar. */}
          <div className={s.grip}>
            <div className={`${s.gripHandle}${nameColumn.dragging ? ` ${s.gripActive}` : ''}`}
              style={{ height: view.height }} {...nameColumn.handleProps} />
          </div>

          <div className={s.ruler}>
            <div className={s.corner}>Instante</div>
            {columns.map((c, i) => (c.instant % RULER_EVERY === 0 || c.instant === 1) && i !== last && (
              <span key={c.instant} className={s.tick} style={{ left: nameW + i * cell }}>
                <span>{c.instant}</span>
              </span>
            ))}
            {/* el instante actual: un solo nodo que se corre de columna, no uno nuevo por instante */}
            {last >= 0 && (
              <span className={`${s.tick} ${s.now}`} style={{ left: nameW + last * cell }}>
                <span>{columns[last].instant}</span>
              </span>
            )}
          </div>

          {last >= 0 && <div className={s.cursor} style={{ left: nameW + last * cell, top: RULER_H }} />}
          {deadlockColumn >= 0 && (
            <div className={s.deadlock} style={{ left: nameW + (deadlockColumn + 1) * cell }}>
              <span>Deadlock: nadie puede avanzar</span>
            </div>
          )}
          {hover !== null && hover !== pinned?.index && (
            <div className={s.column} style={{ left: nameW + hover * cell, top: RULER_H }} />
          )}
          {pinnedColumn && pinned && (
            <div className={`${s.column} ${s.pinned}`} style={{ left: nameW + pinned.index * cell, top: RULER_H }} />
          )}

          {rows.slice(range.first, range.end).map((row, k) => {
            const index = range.first + k;
            const top = RULER_H + index * ROW_H;
            if (row.kind === 'monitor') {
              return (
                <TimelineRow key={`m-${row.name}`} kind="monitor" name={row.name} top={top} cell={cell}
                  nameWidth={nameW} columns={columns} byId={byId} last={index === monitors.length - 1} />
              );
            }
            const p = byId.get(row.id);
            if (!p) return null;
            const next = rows[index + 1];
            const nextProc = next?.kind === 'process' ? byId.get(next.id) : undefined;
            const cut = nextProc !== undefined && familyOf(nextProc.name) !== familyOf(p.name);
            return (
              <TimelineRow key={row.id} kind="process" process={p} top={top} cell={cell}
                nameWidth={nameW} columns={columns} cut={cut} />
            );
          })}

        </div>
      </div>

      {pinnedColumn && pinned && <InstantCard column={pinnedColumn} at={pinned.at} area={plane} />}
    </section>
  );
}
