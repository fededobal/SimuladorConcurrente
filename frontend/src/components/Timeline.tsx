import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { ExpandButton } from './ExpandButton';
import { MAX_VISIBLES } from './MasMenos';
import { STATE_CLASS, STATE_HINT, STATE_LABEL, type VisibleState } from '../processStates';
import { shortName } from '../monitorDiagram';
import { familyOf, type Timeline as TimelineData, type TimelineColumn } from '../timeline';
import type { LogEntry, ProcessView } from '../types';

interface Props {
  timeline: TimelineData;
  /** Procesos del snapshot actual: de aca salen el nombre y el color de cada fila. */
  processes: readonly ProcessView[];
  expanded: boolean;
  onToggleExpand: () => void;
}

// Iguales a --tl-* de index.css: posicionan las filas y los tramos, que son absolutos.
const ROW_H = 22;
/** El carril de un monitor es un poco mas alto que una fila de proceso. */
const MON_H = 26;
const RULER_H = 18;
const NAME_W = 140;
/** Aire debajo de la ultima fila, para que no quede pegada al borde de la ventana. */
const BOTTOM_PAD = 14;
/** Anchos de columna (px) que recorre el zoom; el del medio es el de arranque. */
const CELL_WIDTHS = [8, 12, 16, 22, 30] as const;
const DEFAULT_CELL = 2;
/** Tipografia de los rotulos de los tramos; igual a .tl-tramo en index.css. */
const FUENTE_ROTULO = "9.5px system-ui, -apple-system, 'Segoe UI', sans-serif";
/** Margen interno de un tramo a cada lado del rotulo; igual al padding de .tl-tramo. */
const MARGEN_ROTULO = 4;
/** Ancho aproximado de un caracter, por si no hay canvas para medir. */
const ANCHO_CHAR = 5.4;
const ANCHO_TARJETA = 300;

/** Cada cuantos instantes se rotula la regla. */
const RULER_EVERY = 5;

/** Estados que aparecen en la leyenda (el terminado es la ausencia de barra). */
const LEGEND: readonly VisibleState[] = [
  'RUNNING_PROCESS', 'RUNNING_MONITOR', 'COMPETING', 'WAITING', 'DELAYED', 'READY',
];

/** Tramo de instantes seguidos en el mismo estado y lugar: se dibuja como una sola barra. */
interface Segment {
  state: VisibleState;
  where: string | null;
  from: number;
  length: number;
}

function segmentsOf(id: number, columns: readonly TimelineColumn[]): Segment[] {
  const out: Segment[] = [];
  columns.forEach((col, i) => {
    const state = col.states[id];
    if (state === undefined || state === 'TERMINATED') return;
    const where = col.where[id] ?? null;
    const prev = out[out.length - 1];
    if (prev && prev.state === state && prev.where === where && prev.from + prev.length === i) {
      prev.length++;
    } else {
      out.push({ state, where, from: i, length: 1 });
    }
  });
  return out;
}

/** Tramos del carril de un monitor: quien lo tuvo en cada instante (null: libre). */
interface OwnerSegment {
  owner: number | null;
  from: number;
  length: number;
}

function ownerSegmentsOf(name: string, columns: readonly TimelineColumn[]): OwnerSegment[] {
  const out: OwnerSegment[] = [];
  columns.forEach((col, i) => {
    const owner = col.owners[name] ?? null;
    const prev = out[out.length - 1];
    if (prev && prev.owner === owner) prev.length++;
    else out.push({ owner, from: i, length: 1 });
  });
  return out;
}

/** Rotulo largo de un tramo: la causa de la espera o el monitor en el que ejecuta. */
function labelOf(s: Segment): string {
  switch (s.state) {
    case 'RUNNING_MONITOR': return s.where ?? '';
    case 'COMPETING': return s.where ? `espera entrar a ${s.where}` : 'espera entrar';
    case 'WAITING': return s.where ? `wait(${s.where})` : 'wait';
    case 'DELAYED': return 'delay';
    default: return '';
  }
}

// Se mide el texto de verdad en vez de estimarlo: una estimacion con margen descartaba
// nombres que entraban, y el tramo mostraba la abreviatura sin necesidad.
let medidor: CanvasRenderingContext2D | null | undefined;
function textWidth(text: string, bold: boolean): number {
  if (medidor === undefined) medidor = document.createElement('canvas').getContext('2d');
  if (!medidor) return text.length * ANCHO_CHAR;
  medidor.font = (bold ? '600 ' : '') + FUENTE_ROTULO;
  return medidor.measureText(text).width;
}

/** true si el rotulo entra en un tramo de ese ancho con su margen. */
function fits(text: string, width: number, bold = false): boolean {
  return text !== '' && width >= textWidth(text, bold) + 2 * MARGEN_ROTULO;
}

/**
 * El nombre entero si entra; si no, todos los caracteres que entren. En una familia se
 * conserva el indice ("Clien[3]"), que es lo que distingue a un proceso de otro; si ni asi
 * entra, la abreviatura del punto del dibujo ("C3"); si no, nada.
 */
function nameThatFits(name: string, width: number, bold: boolean): string {
  if (fits(name, width, bold)) return name;
  const fam = /^(.*?)(\[.*\])$/.exec(name);
  const base = fam ? fam[1] : name;
  const indice = fam ? fam[2] : '';
  for (let n = base.length - 1; n >= 2; n--) {
    const recortado = base.slice(0, n) + indice;
    if (fits(recortado, width, bold)) return recortado;
  }
  const corto = shortName(name);
  return fits(corto, width, bold) ? corto : '';
}

/**
 * Linea de tiempo: una fila por proceso y una columna por instante, con el estado en que
 * quedo cada proceso. Arriba, un carril por monitor con quien lo tuvo en cada instante. Las
 * filas no se mueven, asi se puede seguir a un proceso de punta a punta; al pasar el mouse
 * por una columna, una tarjeta cuenta en palabras que paso en ese instante.
 */
export function Timeline({ timeline, processes, expanded, onToggleExpand }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { columns, order, monitors } = timeline;
  const [cellIndex, setCellIndex] = useState(DEFAULT_CELL);
  const cell = CELL_WIDTHS[cellIndex];
  // columna bajo el mouse y columna fijada con un clic: la tarjeta muestra la fijada si hay
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);

  const byId = useMemo(() => new Map(processes.map((p) => [p.id, p])), [processes]);
  const segments = useMemo(
    () => new Map(order.map((id) => [id, segmentsOf(id, columns)])),
    [order, columns],
  );
  const ownerSegments = useMemo(
    () => new Map(monitors.map((m) => [m, ownerSegmentsOf(m, columns)])),
    [monitors, columns],
  );

  // Seguir el ultimo instante, como la salida; salvo que el alumno se haya ido hacia atras
  // para mirar un instante viejo.
  const siguiendo = useRef(true);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && siguiendo.current) el.scrollLeft = el.scrollWidth;
  }, [columns.length, cell]);
  const onScroll = () => {
    const el = scrollRef.current;
    if (el) siguiendo.current = el.scrollLeft + el.clientWidth >= el.scrollWidth - cell;
  };

  const columnAt = (e: React.MouseEvent<HTMLDivElement>): number | null => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - rect.left - NAME_W) / cell);
    return i >= 0 && i < columns.length ? i : null;
  };

  const monitorsH = monitors.length * MON_H;
  const ancho = NAME_W + Math.max(columns.length, 1) * cell + cell;
  const alto = RULER_H + monitorsH + order.length * ROW_H + BOTTOM_PAD;
  const shown = pinned ?? hover;
  // la tarjeta va a la derecha de la columna; si no entra en lo visible, a la izquierda
  const visibleRight = (scrollRef.current?.scrollLeft ?? 0) + (scrollRef.current?.clientWidth ?? ancho);
  const cardLeft = shown === null ? 0
    : NAME_W + (shown + 1) * cell + 8 + ANCHO_TARJETA > visibleRight
      ? Math.max(NAME_W, NAME_W + shown * cell - ANCHO_TARJETA - 8)
      : NAME_W + (shown + 1) * cell + 8;

  return (
    <section className="timeline tarjeta" aria-label="Línea de tiempo">
      <header className="panel-head">
        <span className="titulo">Línea de tiempo</span>
        <ul className="tl-leyenda">
          {LEGEND.map((s) => (
            <li key={s} title={STATE_HINT[s]}>
              <span className={`tl-muestra ${STATE_CLASS[s]}`} />
              {STATE_LABEL[s]}
            </li>
          ))}
        </ul>
        <div className="panel-acciones">
          <button type="button" className="amp" onClick={() => setCellIndex((i) => Math.max(0, i - 1))}
            disabled={cellIndex === 0} aria-label="Ver más instantes" title="Ver más instantes">
            <ZoomOut size={14} />
          </button>
          <button type="button" className="amp"
            onClick={() => setCellIndex((i) => Math.min(CELL_WIDTHS.length - 1, i + 1))}
            disabled={cellIndex === CELL_WIDTHS.length - 1} aria-label="Ver menos instantes, más grandes"
            title="Ver menos instantes, más grandes">
            <ZoomIn size={14} />
          </button>
          <ExpandButton expanded={expanded} onClick={onToggleExpand} />
        </div>
      </header>

      <div className="tl-scroll" ref={scrollRef} onScroll={onScroll}>
        <div
          className="tl-plano"
          style={{ width: ancho, height: alto, ['--tl-cell-w' as string]: `${cell}px` }}
          onMouseMove={(e) => setHover(columnAt(e))}
          onMouseLeave={() => setHover(null)}
          onClick={(e) => { const i = columnAt(e); setPinned((p) => (i === null || p === i ? null : i)); }}
        >
          <div className="tl-regla">
            <div className="tl-esquina">instante</div>
            {columns.map((c, i) => (c.instant % RULER_EVERY === 0 || i === columns.length - 1) && (
              <span
                key={c.instant}
                className={i === columns.length - 1 ? 'actual' : undefined}
                style={{ left: NAME_W + i * cell }}
              >
                {c.instant}
              </span>
            ))}
          </div>

          {columns.length > 0 && (
            <div
              className="tl-cursor"
              style={{ left: NAME_W + (columns.length - 1) * cell, top: RULER_H }}
            />
          )}
          {shown !== null && (
            <div className={`tl-columna${pinned !== null ? ' fija' : ''}`}
              style={{ left: NAME_W + shown * cell, top: RULER_H }} />
          )}

          {/* carriles de los monitores: quien tuvo cada uno en cada instante */}
          {monitors.map((name, i) => (
            <div
              key={name}
              className={`tl-fila tl-mon${i === monitors.length - 1 ? ' ultimo' : ''}`}
              style={{ top: RULER_H + i * MON_H, height: MON_H }}
              title={`${name}: quién tiene el monitor en cada instante`}
            >
              <div className="tl-nombre">
                {name}
                <span className="tl-tag">monitor</span>
              </div>
              {ownerSegments.get(name)?.map((s) => {
                const owner = s.owner === null ? undefined : byId.get(s.owner);
                const width = s.length * cell;
                return (
                  <div
                    key={s.from}
                    className={`tl-tramo ${owner ? 'tl-dueno' : 'tl-libre'}`}
                    style={{ left: NAME_W + s.from * cell, width, background: owner?.color }}
                    title={owner ? `${owner.name} tiene ${name}` : `${name} libre`}
                  >
                    {owner ? nameThatFits(owner.name, width, true) : (fits('libre', width) ? 'libre' : '')}
                  </div>
                );
              })}
            </div>
          ))}

          {order.map((id, fila) => {
            const p = byId.get(id);
            if (!p) return null;
            const next = byId.get(order[fila + 1] ?? -1);
            const corte = next !== undefined && familyOf(next.name) !== familyOf(p.name);
            const ultimo = columns[columns.length - 1]?.states[id];
            return (
              <div
                key={id}
                className={`tl-fila${corte ? ' tl-corte' : ''}`}
                style={{ top: RULER_H + monitorsH + fila * ROW_H, ['--st-proceso' as string]: p.color }}
                title={ultimo ? `${p.name}: ${STATE_HINT[ultimo]}` : p.name}
              >
                <div className="tl-nombre" style={{ color: p.color }}>{p.name}</div>
                {segments.get(id)?.map((s) => {
                  const width = s.length * cell;
                  const label = labelOf(s);
                  const text = s.state === 'RUNNING_MONITOR' ? nameThatFits(label, width, true)
                    : fits(label, width) ? label : '';
                  return (
                    <div
                      key={s.from}
                      className={`tl-tramo ${STATE_CLASS[s.state]}`}
                      style={{ left: NAME_W + s.from * cell, width }}
                      title={label || undefined}
                    >
                      {text}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {shown !== null && columns[shown] && (
            <InstantCard column={columns[shown]} left={cardLeft} top={RULER_H + 6} />
          )}
        </div>
      </div>
    </section>
  );
}

/** Lo que paso en un instante, en palabras: los eventos del paso, con el proceso en su color. */
function InstantCard({ column, left, top }: { column: TimelineColumn; left: number; top: number }) {
  const events = column.events;
  const visibles = events.slice(0, MAX_VISIBLES);
  return (
    <div className="tl-tarjeta" style={{ left, top }} role="status">
      <b>Instante {column.instant}</b>
      {events.length === 0 && <div className="nadie">Nadie avanzó en este instante.</div>}
      {visibles.map((e) => <Evento key={e.id} e={e} />)}
      {events.length > visibles.length && (
        <div className="nadie">… y {events.length - visibles.length} más</div>
      )}
    </div>
  );
}

/** Un evento del log, "Nombre: texto": el nombre con el color del proceso. */
function Evento({ e }: { e: LogEntry }) {
  const i = e.message.indexOf(': ');
  if (e.processId === null || i < 0) return <div>{e.message}</div>;
  return (
    <div>
      <span className="quien" style={{ color: e.processColor ?? undefined }}>{e.message.slice(0, i)}</span>
      {' '}{e.message.slice(i + 2)}
    </div>
  );
}
