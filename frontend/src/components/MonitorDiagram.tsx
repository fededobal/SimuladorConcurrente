import { Fragment, useId, useState } from 'react';
import {
  arrowsOf, shortName, tokenPosition, tokensOf, TOKENS_PER_ZONE,
  type Arrow, type Token, type Zone,
} from '../monitorDiagram';
import { MasMenos, MAX_VISIBLES } from './MasMenos';
import { MonitorVars } from './MonitorVars';
import { segundosRestantes } from '../useAhora';
import type { CondView, LogEntry, MonitorView, ProcessView, ProcRef } from '../types';

interface Props {
  readonly monitor: MonitorView;
  /** Procesos por id: para saber si el dueno del monitor esta en delay o esperando en otro. */
  readonly processes: ReadonlyMap<number, ProcessView>;
  /** Eventos del ultimo paso: resaltan las flechas que se recorrieron. */
  readonly entries: readonly LogEntry[];
  readonly ahora: number;
  /** Si se puede ampliar, un clic sobre el dibujo lo hace. */
  readonly onExpand?: () => void;
}

// Geometria del dibujo (unidades del viewBox). Copia la disposicion de la teoria: la zona 1
// (compitiendo) a la izquierda, la 3 (en monitor) a la derecha y la 2 (en wait) arriba,
// entre las dos. Cada zona es un cuadrado de lado 2R con las esquinas redondeadas.
const W = 300;
const H = 146;
const R = 34;
const CENTRO: Record<Zone, [number, number]> = { 1: [70, 104], 2: [150, 40], 3: [230, 104] };
const [X1, Y1] = CENTRO[1];
const [X2, Y2] = CENTRO[2];
const [X3] = CENTRO[3];
const RADIO_PUNTO = 7;

/** Rotulo de cada zona, arriba del cuadrado; el mismo nombre que en las listas de abajo. */
const ZONA_TITULO: Record<Zone, string> = { 1: 'Compitiendo', 2: 'En wait', 3: 'En monitor' };

const ZONA_TEXTO: Record<Zone, string> = {
  1: 'espera acceso al monitor',
  2: 'cola por variable condición',
  3: 'ejecutando en el monitor',
};
/** Redondeo de las esquinas de cada zona. */
const ESQUINA = 6;

/**
 * Un monitor dibujado como en la teoria: tres zonas y los procesos como puntos. Debajo, en
 * texto, quien esta en cada cola (la de entrada y la de cada variable condicion) y en que
 * orden, y las variables del monitor con su estructura. En el panel ampliado el dibujo es
 * mas grande (lo da el CSS); no cambia de forma.
 */
export function MonitorDiagram({ monitor, processes, entries, ahora, onExpand }: Props) {
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

      <svg className={`mon-dibujo${onExpand ? ' ampliable' : ''}`} viewBox={`0 0 ${W} ${H}`}
        role="img" aria-label={`${monitor.name}: ${estado}`} onClick={onExpand}>
        {onExpand && <title>Clic para ampliar</title>}
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
        {flecha('wait', `M${X3 - 21},${Y1 - R - 1} Q${X3 - 22},${Y2 + 6} ${X2 + R + 1},${Y2 + 2}`)}
        {rotulo('wait', 'wait', X3 - 16, Y2 + 14)}
        {flecha('signal', `M${X2 - R - 1},${Y2 + 2} Q${X1 + 22},${Y2 + 6} ${X1 + 21},${Y1 - R - 2}`)}
        {rotulo('signal', 'signal', X1 + 16, Y2 + 14, 'end')}

        {([1, 2, 3] as const).map((z) => {
          const [cx, cy] = CENTRO[z];
          return (
            <g key={z}>
              <rect x={cx - R} y={cy - R} width={2 * R} height={2 * R} rx={ESQUINA}
                className="mon-zona">
                <title>{`${ZONA_TITULO[z]}: ${ZONA_TEXTO[z]}`}</title>
              </rect>
              <text x={cx} y={cy - R + 11} textAnchor="middle" className="mon-zona-titulo">
                {ZONA_TITULO[z]}
              </text>
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
        <Esperas conds={monitor.conds} />
      </dl>
      <MonitorVars vars={monitor.vars} processes={processes} />
    </section>
  );
}

/** Aclaracion sobre el dueno cuando no esta ejecutando: en delay, o esperando en otro monitor. */
function notaDelDueno(p: ProcessView | undefined, ahora: number): string {
  if (!p || p.state !== 'BLOCKED') return '';
  if (p.delayEndsAt !== null) return `, en delay (${segundosRestantes(p.delayEndsAt, ahora)} s)`;
  return `, esperando en ${p.blockedOn ?? 'otro monitor'}`;
}

/**
 * Nombres en orden de cola, cada uno con el color de su proceso; un guion si no hay nadie.
 * Con mas de {@link MAX_VISIBLES}, muestra los primeros y un boton para ver el resto.
 */
function Nombres({ procs }: { procs: readonly ProcRef[] }) {
  const [abierta, setAbierta] = useState(false);
  if (procs.length === 0) return <span className="nadie">—</span>;
  const limitada = procs.length > MAX_VISIBLES;
  const recortada = limitada && !abierta;
  const visibles = recortada ? procs.slice(0, MAX_VISIBLES) : procs;
  return (
    <>
      {visibles.map((p, i) => (
        <span key={p.id} style={{ color: p.color }}>
          {p.name}{i < visibles.length - 1 ? ', ' : ''}
        </span>
      ))}
      {limitada && (
        <MasMenos abierta={abierta} faltan={procs.length - MAX_VISIBLES}
          onClick={() => setAbierta(!abierta)} />
      )}
    </>
  );
}

/**
 * Una fila "En wait(cond)" por variable condicion, en el orden en que se declararon. Con un
 * arreglo de cond (una por cliente) son muchas filas, asi que plegado muestra solo las que
 * tienen a alguien esperando, hasta {@link MAX_VISIBLES} procesos, y un boton abre todas.
 */
function Esperas({ conds }: { conds: readonly CondView[] }) {
  const [abierta, setAbierta] = useState(false);
  const total = conds.reduce((n, c) => n + c.queue.length, 0);

  let visibles: CondView[] = [...conds];
  if (!abierta) {
    visibles = [];
    let quedan = MAX_VISIBLES;
    for (const c of conds) {
      if (c.queue.length === 0 || quedan === 0) continue;
      visibles.push({ name: c.name, queue: c.queue.slice(0, quedan) });
      quedan -= Math.min(c.queue.length, quedan);
    }
  }
  const ocultas = conds.length - visibles.length;
  const recortadas = !abierta && (ocultas > 0 || visibles.some((c, i) => c.queue.length < conds[i].queue.length));

  return (
    <>
      {visibles.map((c) => (
        <Fragment key={c.name}>
          <dt>En wait(<span className="cond">{c.name}</span>)</dt>
          <dd><Nombres procs={c.queue} /></dd>
        </Fragment>
      ))}
      {total === 0 && !abierta && (
        <>
          <dt>En wait</dt>
          <dd><span className="nadie">—</span></dd>
        </>
      )}
      {(recortadas || abierta) && conds.length > 0 && (
        <>
          <dt />
          <dd>
            <MasMenos abierta={abierta} faltan={ocultas} onClick={() => setAbierta(!abierta)}
              texto={`ver las ${conds.length} cond`} />
          </dd>
        </>
      )}
    </>
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
