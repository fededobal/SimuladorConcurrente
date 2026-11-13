import { useId } from 'react';
import {
  arrowsOf, shortName, tokenPosition, tokensOf, TOKENS_PER_ZONE,
  type Arrow, type Token, type Zone,
} from '../monitorDiagram';
import { segundosRestantes } from '../useAhora';
import type { LogEntry, MonitorView, ProcessView, ProcRef } from '../types';

interface Props {
  readonly monitor: MonitorView;
  /** Procesos por id: para saber si el dueno del monitor esta en delay o esperando en otro. */
  readonly processes: ReadonlyMap<number, ProcessView>;
  /** Eventos del ultimo paso: resaltan las flechas que se recorrieron. */
  readonly entries: readonly LogEntry[];
  readonly ahora: number;
}

// Geometria del dibujo (unidades del viewBox). Copia la disposicion de la teoria: la zona 1
// a la izquierda, la 3 a la derecha y la 2 arriba, entre las dos.
const W = 300;
const H = 146;
const R = 34;
const CENTRO: Record<Zone, [number, number]> = { 1: [70, 104], 2: [150, 40], 3: [230, 104] };
const [X1, Y1] = CENTRO[1];
const [X2, Y2] = CENTRO[2];
const [X3] = CENTRO[3];
const RADIO_PUNTO = 7;

const ZONA_TEXTO: Record<Zone, string> = {
  1: 'espera acceso al monitor',
  2: 'cola por variable condición',
  3: 'ejecutando en el monitor',
};

/**
 * Un monitor dibujado como en la teoria: tres zonas y los procesos como puntos. Debajo, en
 * texto, quien esta en cada cola y en que orden.
 */
export function MonitorDiagram({ monitor, processes, entries, ahora }: Props) {
  const id = useId();
  const punta = `${id}-punta`;
  const activas = arrowsOf(monitor.name, entries);
  const tokens = tokensOf(monitor);

  const dueno = monitor.lockOwner ? processes.get(monitor.lockOwner.id) : undefined;
  const estado = !monitor.lockOwner ? 'libre'
    : `${monitor.lockOwner.name} adentro${notaDelDueno(dueno, ahora)}`;

  // posicion de cada punto dentro de su zona; los que no entran se cuentan con "+n"
  const total: Record<Zone, number> = { 1: 0, 2: 0, 3: 0 };
  for (const t of tokens) total[t.zone]++;
  const enZona: Record<Zone, number> = { 1: 0, 2: 0, 3: 0 };
  const visibles: Array<Token & { x: number; y: number }> = [];
  for (const t of tokens) {
    const i = enZona[t.zone]++;
    if (total[t.zone] > TOKENS_PER_ZONE && i >= TOKENS_PER_ZONE - 1) continue;
    const [x, y] = tokenPosition(t.zone, i, ...CENTRO[t.zone]);
    visibles.push({ ...t, x, y });
  }

  const flecha = (a: Arrow, d: string) => (
    <path d={d} className={`mon-flecha${activas.has(a) ? ' activa' : ''}`}
      markerEnd={`url(#${punta})`} />
  );
  const rotulo = (a: Arrow, texto: string, x: number, y: number,
    ancla: 'start' | 'middle' | 'end' = 'start') => (
    <text x={x} y={y} textAnchor={ancla} className={`mon-rotulo${activas.has(a) ? ' activo' : ''}`}>
      {texto}
    </text>
  );

  return (
    <section className="mon" aria-label={`Monitor ${monitor.name}`}>
      <header>
        <span className="mon-nombre">{monitor.name}</span>
        <span className="mon-estado">{estado}</span>
      </header>

      <svg className="mon-dibujo" viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`${monitor.name}: ${estado}`}>
        <defs>
          <marker id={punta} viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5"
            markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0 L6,3 L0,6 z" className="mon-punta" />
          </marker>
        </defs>

        {flecha('call', `M2,${Y1} L${X1 - R - 2},${Y1}`)}
        {rotulo('call', 'Call', 2, Y1 - 6)}
        {flecha('entra', `M${X1 + R + 1},${Y1} L${X3 - R - 2},${Y1}`)}
        {rotulo('entra', 'entra', (X1 + X3) / 2, Y1 + 13, 'middle')}
        {flecha('return', `M${X3 + R + 1},${Y1} L${W - 2},${Y1}`)}
        {rotulo('return', 'Return', W - 2, Y1 - 6, 'end')}
        {flecha('wait', `M${X3 - 21},${Y1 - 27} Q${X3 - 22},${Y2 + 6} ${X2 + R + 1},${Y2 + 2}`)}
        {rotulo('wait', 'wait', X3 - 16, Y2 + 14)}
        {flecha('signal', `M${X2 - R - 1},${Y2 + 2} Q${X1 + 22},${Y2 + 6} ${X1 + 21},${Y1 - 28}`)}
        {rotulo('signal', 'signal', X1 + 16, Y2 + 14, 'end')}

        {([1, 2, 3] as const).map((z) => {
          const [cx, cy] = CENTRO[z];
          return (
            <g key={z}>
              <circle cx={cx} cy={cy} r={R} className="mon-zona">
                <title>{`${z}: ${ZONA_TEXTO[z]}`}</title>
              </circle>
              <text x={cx} y={cy - R + 11} textAnchor="middle" className="mon-num">{z}</text>
              {total[z] > TOKENS_PER_ZONE && (
                <text x={cx + 17} y={cy + 17} dy="0.35em" textAnchor="middle" className="mon-mas">
                  +{total[z] - (TOKENS_PER_ZONE - 1)}
                </text>
              )}
            </g>
          );
        })}

        {visibles.map((t) => (
          <Punto key={t.proc.id} token={t} x={t.x} y={t.y} proceso={processes.get(t.proc.id)} />
        ))}
      </svg>

      <dl className="mon-estados">
        <dt>Compitiendo</dt>
        <dd><Nombres procs={monitor.entryQueue} /></dd>
        <dt>En monitor</dt>
        <dd><Nombres procs={monitor.lockOwner ? [monitor.lockOwner] : []} /></dd>
        <dt>En wait</dt>
        <dd><EnWait monitor={monitor} /></dd>
      </dl>
    </section>
  );
}

/** Aclaracion sobre el dueno cuando no esta ejecutando: en delay, o esperando en otro monitor. */
function notaDelDueno(p: ProcessView | undefined, ahora: number): string {
  if (!p || p.state !== 'BLOCKED') return '';
  if (p.delayEndsAt !== null) return `, en delay (${segundosRestantes(p.delayEndsAt, ahora)} s)`;
  return `, esperando en ${p.blockedOn ?? 'otro monitor'}`;
}

/** Nombres en orden de cola, cada uno con el color de su proceso; un guion si no hay nadie. */
function Nombres({ procs }: { procs: readonly ProcRef[] }) {
  if (procs.length === 0) return <span className="nadie">—</span>;
  return (
    <>
      {procs.map((p, i) => (
        <span key={p.id} style={{ color: p.color }}>
          {p.name}{i < procs.length - 1 ? ', ' : ''}
        </span>
      ))}
    </>
  );
}

/** Los procesos dormidos, agrupados por variable condicion, cada grupo en el orden de su cola. */
function EnWait({ monitor }: { monitor: MonitorView }) {
  const conds = monitor.conds.filter((c) => c.queue.length > 0);
  if (conds.length === 0) return <span className="nadie">—</span>;
  return (
    <ul className="mon-wait">
      {conds.map((c) => (
        <li key={c.name}>
          <span className="cond">{c.name}:</span> <Nombres procs={c.queue} />
        </li>
      ))}
    </ul>
  );
}

interface PuntoProps {
  readonly token: Token;
  readonly x: number;
  readonly y: number;
  readonly proceso: ProcessView | undefined;
}

/**
 * Un proceso. La posicion va en el atributo transform de SVG, en unidades del viewBox: con
 * la propiedad transform de CSS algunos navegadores la toman en pixeles de pantalla y el
 * punto queda fuera de su zona. Si es el dueno pero no esta ejecutando (en delay o esperando
 * en otro monitor), lleva un anillo punteado.
 */
function Punto({ token, x, y, proceso }: PuntoProps) {
  const noEjecuta = token.zone === 3 && proceso?.state === 'BLOCKED';
  const titulo = token.cond ? `${token.proc.name}: dormido en ${token.cond}`
    : token.zone === 1 ? `${token.proc.name}: compite por entrar`
      : `${token.proc.name}: tiene el monitor`;
  return (
    <g transform={`translate(${x} ${y})`}>
      <title>{titulo}</title>
      {noEjecuta && <circle r={RADIO_PUNTO + 3} className="mon-anillo" />}
      <circle r={RADIO_PUNTO} fill={token.proc.color} />
      <text textAnchor="middle" dy="0.35em" className="mon-punto-texto">
        {shortName(token.proc.name)}
      </text>
    </g>
  );
}
