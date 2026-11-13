import { useId } from 'react';
import {
  arrowsOf, eventsOf, shortName, tokenPosition, tokensOf, TOKENS_PER_ZONE,
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
const W = 380;
const H = 214;
const R = 44;
const CENTRO: Record<Zone, [number, number]> = { 1: [90, 150], 2: [185, 60], 3: [280, 150] };
const [X1, Y1] = CENTRO[1];
const [X2, Y2] = CENTRO[2];
const [X3] = CENTRO[3];
const RADIO_PUNTO = 10;

/** Cuando hay mas cond que esto, solo se listan las que tienen procesos. */
const MAX_CONDS_LISTADAS = 6;

const ZONA_TEXTO: Record<Zone, string> = {
  1: 'Espera acceso al monitor',
  2: 'Cola por variable condición',
  3: 'Ejecutando en el monitor',
};

/**
 * Un monitor dibujado como en la teoria: tres zonas y los procesos como puntos que pasan de
 * una a otra. Debajo, las colas en orden y lo que paso en el ultimo instante.
 */
export function MonitorDiagram({ monitor, processes, entries, ahora }: Props) {
  const id = useId();
  const flecha = `${id}-flecha`;
  const flechaActiva = `${id}-flecha-activa`;
  const activas = arrowsOf(monitor.name, entries);
  const eventos = eventsOf(monitor.name, entries);
  const tokens = tokensOf(monitor);

  const dueno = monitor.lockOwner ? processes.get(monitor.lockOwner.id) : undefined;
  const estado = !monitor.lockOwner ? 'libre'
    : `ocupado por ${monitor.lockOwner.name}${notaDelDueno(dueno, ahora)}`;

  // posicion de cada punto dentro de su zona; los que no entran se cuentan aparte
  const enZona: Record<Zone, number> = { 1: 0, 2: 0, 3: 0 };
  const total: Record<Zone, number> = { 1: 0, 2: 0, 3: 0 };
  for (const t of tokens) total[t.zone]++;
  const visibles: Array<Token & { x: number; y: number }> = [];
  for (const t of tokens) {
    const i = enZona[t.zone]++;
    const lleno = total[t.zone] > TOKENS_PER_ZONE && i >= TOKENS_PER_ZONE - 1;
    if (lleno) continue;
    const [cx, cy] = CENTRO[t.zone];
    const [x, y] = tokenPosition(t.zone, i, cx, cy);
    visibles.push({ ...t, x, y });
  }

  const flechaProps = (a: Arrow) => ({
    className: `mon-flecha${activas.has(a) ? ' activa' : ''}`,
    markerEnd: `url(#${activas.has(a) ? flechaActiva : flecha})`,
  });

  return (
    <section className="mon" aria-label={`Monitor ${monitor.name}`}>
      <header>
        <span className="mon-nombre">{monitor.name}</span>
        <span className={`mon-estado${monitor.lockOwner ? ' ocupado' : ''}`}>{estado}</span>
      </header>

      <svg className="mon-dibujo" viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`${monitor.name}: ${estado}`}>
        <defs>
          <marker id={flecha} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7"
            markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 z" className="mon-punta" />
          </marker>
          <marker id={flechaActiva} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7"
            markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 z" className="mon-punta activa" />
          </marker>
        </defs>

        {/* flechas: las rotula igual que la teoria */}
        <path d={`M4,${Y1} L${X1 - R - 3},${Y1}`} {...flechaProps('call')} />
        <text x={6} y={Y1 - 10} className={`mon-rotulo${activas.has('call') ? ' activo' : ''}`}>Call</text>

        <path d={`M${X1 + R + 2},${Y1} L${X3 - R - 3},${Y1}`} {...flechaProps('entra')} />
        <text x={(X1 + X3) / 2} y={Y1 + 18} textAnchor="middle"
          className={`mon-rotulo${activas.has('entra') ? ' activo' : ''}`}>entra</text>

        <path d={`M${X3 + R + 2},${Y1} L${W - 3},${Y1}`} {...flechaProps('return')} />
        <text x={W - 4} y={Y1 - 10} textAnchor="end"
          className={`mon-rotulo${activas.has('return') ? ' activo' : ''}`}>Return</text>

        <path d={`M${X3 - 28},${Y1 - 34} Q${X3 - 30},${Y2 + 8} ${X2 + R + 2},${Y2 + 2}`}
          {...flechaProps('wait')} />
        <text x={X3 - 22} y={Y2 + 20} className={`mon-rotulo${activas.has('wait') ? ' activo' : ''}`}>wait</text>

        <path d={`M${X2 - R - 2},${Y2 + 2} Q${X1 + 30},${Y2 + 8} ${X1 + 28},${Y1 - 36}`}
          {...flechaProps('signal')} />
        <text x={X1 + 22} y={Y2 + 20} textAnchor="end"
          className={`mon-rotulo${activas.has('signal') ? ' activo' : ''}`}>signal</text>

        {([1, 2, 3] as const).map((z) => {
          const [cx, cy] = CENTRO[z];
          const resto = total[z] - (TOKENS_PER_ZONE - 1);
          return (
            <g key={z}>
              <circle cx={cx} cy={cy} r={R} className={`mon-zona z${z}`}>
                <title>{`${z} - ${ZONA_TEXTO[z]}`}</title>
              </circle>
              <text x={cx} y={cy - R + 15} textAnchor="middle" className="mon-num">{z}</text>
              {total[z] > TOKENS_PER_ZONE && (
                <text x={cx + 23} y={cy + 37} textAnchor="middle" className="mon-mas">+{resto}</text>
              )}
            </g>
          );
        })}

        {visibles.map((t) => (
          <Punto key={t.proc.id} token={t} x={t.x} y={t.y}
            proceso={processes.get(t.proc.id)} ahora={ahora} />
        ))}
      </svg>

      <ul className="mon-colas">
        <li>
          <span className="mon-z z1">1</span>
          <span className="mon-cola-nombre">cola de entrada</span>
          <Chips procs={monitor.entryQueue} vacia="nadie compite" />
          {monitor.entryQueue.length > 1 && <span className="mon-nota">compiten, sin orden</span>}
        </li>
        {condsAListar(monitor).map((c) => (
          <li key={c.name}>
            <span className="mon-z z2">2</span>
            <code className="mon-cola-nombre">{c.name}</code>
            <Chips procs={c.queue} vacia="vacía" />
            {c.queue.length > 1 && <span className="mon-nota">el primero sale con signal</span>}
          </li>
        ))}
        {monitor.conds.length > MAX_CONDS_LISTADAS && (
          <li className="mon-nota">
            {monitor.conds.filter((c) => c.queue.length === 0).length} variables condición vacías
          </li>
        )}
      </ul>

      {eventos.length > 0 && (
        <ul className="mon-eventos" aria-label="Último instante">
          {eventos.map((e) => (
            <li key={e.id} style={{ borderLeftColor: e.processColor ?? undefined }}>{e.message}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Las cond que se listan: todas, o solo las que tienen procesos si son muchas (arreglos). */
function condsAListar(m: MonitorView) {
  return m.conds.length <= MAX_CONDS_LISTADAS ? m.conds : m.conds.filter((c) => c.queue.length > 0);
}

/** Aclaracion sobre el dueno cuando no esta ejecutando: en delay, o esperando en otro monitor. */
function notaDelDueno(p: ProcessView | undefined, ahora: number): string {
  if (!p || p.state !== 'BLOCKED') return '';
  if (p.delayEndsAt !== null) return ` (en delay, faltan ${segundosRestantes(p.delayEndsAt, ahora)} s)`;
  return ` (lo retiene mientras espera en ${p.blockedOn ?? 'otro monitor'})`;
}

function Chips({ procs, vacia }: { procs: readonly ProcRef[]; vacia: string }) {
  if (procs.length === 0) return <span className="mon-vacia">{vacia}</span>;
  return (
    <span className="mon-chips">
      {procs.map((p) => (
        <span key={p.id} className="mon-chip" style={{ ['--c' as string]: p.color }}>{p.name}</span>
      ))}
    </span>
  );
}

interface PuntoProps {
  readonly token: Token;
  readonly x: number;
  readonly y: number;
  readonly proceso: ProcessView | undefined;
  readonly ahora: number;
}

/**
 * Un proceso. Se mueve con una transicion: al pasar de una zona a otra se lo ve viajar. Si
 * es el dueno pero no esta ejecutando (en delay o esperando en otro monitor), lleva un
 * anillo que lo distingue.
 */
function Punto({ token, x, y, proceso, ahora }: PuntoProps) {
  const enDelay = proceso?.delayEndsAt != null;
  const retieneDesdeOtro = token.zone === 3 && proceso?.state === 'BLOCKED' && !enDelay;
  const titulo = token.cond ? `${token.proc.name}: dormido en ${token.cond}`
    : token.zone === 1 ? `${token.proc.name}: compite por entrar`
      : `${token.proc.name}: tiene el monitor`;
  return (
    <g className="mon-punto" style={{ transform: `translate(${x}px, ${y}px)` }}>
      <title>{titulo}</title>
      {(enDelay || retieneDesdeOtro) && (
        <circle r={RADIO_PUNTO + 4} className={enDelay ? 'mon-anillo delay' : 'mon-anillo retiene'} />
      )}
      <circle r={RADIO_PUNTO} fill={token.proc.color} />
      <text textAnchor="middle" dy="0.35em" className="mon-punto-texto">
        {shortName(token.proc.name)}
      </text>
      {enDelay && proceso?.delayEndsAt != null && (
        <text y={RADIO_PUNTO + 15} textAnchor="middle" className="mon-delay">
          {segundosRestantes(proceso.delayEndsAt, ahora)}s
        </text>
      )}
    </g>
  );
}
