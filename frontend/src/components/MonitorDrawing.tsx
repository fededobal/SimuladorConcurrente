import { useId } from 'react';
import type { Arrow } from '../monitorDiagram';
import type { MonitorView, ProcRef } from '../types';
import s from './MonitorCard.module.css';

interface Props {
  readonly monitor: MonitorView;
  /** Flechas recorridas en el ultimo instante. */
  readonly active: ReadonlySet<Arrow>;
  /** Linea en la que esta el proceso que tiene el monitor, o null. */
  readonly ownerLine: number | null;
  /** true si la simulacion termino en interbloqueo: las flechas de salida de la espera no se pueden recorrer. */
  readonly deadlocked: boolean;
}

// Geometria del dibujo (unidades del viewBox, que a ancho normal del panel son casi px).
// Copia la disposicion de la teoria: la zona 1 (compiten) a la izquierda, la 3 (adentro) a la
// derecha y la 2 (en wait) arriba, entre las dos.
const W = 400;
const H = 196;
const ZONE_W = 126;
/** Lugar a cada lado para las flechas call y return, con su rotulo. */
const SIDE = 36;
const ZONE1 = { x: SIDE, y: 108, h: 80 };
const ZONE2 = { x: (W - ZONE_W) / 2, y: 6, h: 76 };
const ZONE3 = { x: W - SIDE - ZONE_W, y: 108, h: 80 };
const MID_Y = ZONE1.y + ZONE1.h / 2;
const ROW_H = 15;
/** Renglones de nombres que entran en una zona, debajo del titulo. */
const ROWS = 3;
/** Caracteres de un nombre que entran en una zona. */
const NAME_CHARS = 16;

function fit(text: string, max = NAME_CHARS): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/**
 * Dibujo de un monitor, como el de la teoria: tres zonas grandes con el nombre completo de
 * cada proceso (no un punto con dos letras) y las flechas entre ellas; la que se recorrio en
 * el ultimo instante queda resaltada.
 */
export function MonitorDrawing({ monitor, active, ownerLine, deadlocked }: Props) {
  const id = useId();
  const head = `${id}-punta`;
  const headActive = `${id}-punta-activa`;
  const waiting = monitor.conds.reduce((n, c) => n + c.queue.length, 0);

  const arrow = (a: Arrow, d: string, dead = false) => (
    <path
      d={d}
      className={`${s.arrow}${active.has(a) ? ` ${s.arrowActive}` : ''}${dead ? ` ${s.arrowDead}` : ''}`}
      markerEnd={`url(#${active.has(a) ? headActive : head})`}
    />
  );
  const label = (a: Arrow, text: string, x: number, y: number, anchor: 'start' | 'middle' | 'end') => (
    <text x={x} y={y} textAnchor={anchor}
      className={`${s.arrowLabel}${active.has(a) ? ` ${s.arrowLabelActive}` : ''}`}>
      {text}
    </text>
  );

  return (
    <svg className={s.drawing} viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={describe(monitor)}>
      <defs>
        <marker id={head} viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" className={s.arrowHead} />
        </marker>
        <marker id={headActive} viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" className={s.arrowHeadActive} />
        </marker>
      </defs>

      {arrow('call', `M2,${MID_Y} L${ZONE1.x - 3},${MID_Y}`)}
      {label('call', 'call', 2, MID_Y - 7, 'start')}
      {arrow('entra', `M${ZONE1.x + ZONE_W + 2},${MID_Y} L${ZONE3.x - 3},${MID_Y}`)}
      {label('entra', 'entra', (ZONE1.x + ZONE_W + ZONE3.x) / 2, MID_Y + 15, 'middle')}
      {arrow('return', `M${ZONE3.x + ZONE_W + 2},${MID_Y} L${W - 2},${MID_Y}`)}
      {label('return', 'return', W - 2, MID_Y - 7, 'end')}
      {arrow('wait', `M${ZONE3.x + 76},${ZONE3.y - 2} C${ZONE3.x + 76},60 ${ZONE3.x + 60},44 ${ZONE2.x + ZONE_W + 4},44`)}
      {label('wait', 'wait', ZONE3.x + 84, 74, 'start')}
      {arrow('signal', `M${ZONE2.x - 2},44 C${ZONE1.x + 66},44 ${ZONE1.x + 50},60 ${ZONE1.x + 50},${ZONE1.y - 4}`,
        deadlocked && waiting > 0)}
      {label('signal', 'signal', ZONE1.x + 42, 74, 'end')}

      {/* 2: una fila por variable condicion, con quien espera en cada una */}
      <rect x={ZONE2.x} y={ZONE2.y} width={ZONE_W} height={ZONE2.h} rx="7"
        className={`${s.zone}${waiting > 0 ? ` ${s.zoneWaiting}` : ''}`} />
      <text x={ZONE2.x + 9} y={ZONE2.y + 16} className={s.zoneTitle}>2 · EN WAIT</text>
      <CondRows monitor={monitor} x={ZONE2.x + 9} y={ZONE2.y + 33} />

      {/* 1: los que compiten por entrar */}
      <rect x={ZONE1.x} y={ZONE1.y} width={ZONE_W} height={ZONE1.h} rx="7"
        className={s.zone} />
      <text x={ZONE1.x + 9} y={ZONE1.y + 16} className={s.zoneTitle}>1 · COMPITEN</text>
      <NameRows procs={monitor.entryQueue} x={ZONE1.x + 9} y={ZONE1.y + 35} />

      {/* 3: el que tiene el monitor */}
      <rect x={ZONE3.x} y={ZONE3.y} width={ZONE_W} height={ZONE3.h} rx="7"
        className={`${s.zone}${monitor.lockOwner ? ` ${s.zoneOwner}` : ''}`} />
      <text x={ZONE3.x + 9} y={ZONE3.y + 16} className={s.zoneTitle}>3 · ADENTRO</text>
      <NameRows procs={monitor.lockOwner ? [monitor.lockOwner] : []} x={ZONE3.x + 9} y={ZONE3.y + 35} />
      {monitor.lockOwner && ownerLine !== null && ownerLine > 0 && (
        <text x={ZONE3.x + 9} y={ZONE3.y + 35 + ROW_H} className={s.note}>línea {ownerLine}</text>
      )}
    </svg>
  );
}

/** Texto alternativo del dibujo: quien esta en cada zona. */
function describe(m: MonitorView): string {
  const names = (ps: readonly ProcRef[]) => (ps.length === 0 ? 'nadie' : ps.map((p) => p.name).join(', '));
  const waiting = m.conds.filter((c) => c.queue.length > 0)
    .map((c) => `${names(c.queue)} en ${c.name}`).join('; ');
  return `Monitor ${m.name}. Compiten: ${names(m.entryQueue)}. En wait: ${waiting || 'nadie'}. `
    + `Adentro: ${m.lockOwner?.name ?? 'nadie'}.`;
}

/** Hasta ROWS nombres con el punto de su color; "nadie" si no hay, "+n más" si sobran. */
function NameRows({ procs, x, y }: { procs: readonly ProcRef[]; x: number; y: number }) {
  if (procs.length === 0) return <text x={x} y={y} className={s.note}>nadie</text>;
  const shown = procs.length > ROWS ? procs.slice(0, ROWS - 1) : procs;
  return (
    <>
      {shown.map((p, i) => (
        <g key={p.id}>
          <circle cx={x + 3} cy={y - 4 + i * ROW_H} r="3.5" fill={p.color} />
          <text x={x + 11} y={y + i * ROW_H} className={s.procName}>{fit(p.name)}</text>
        </g>
      ))}
      {procs.length > shown.length && (
        <text x={x} y={y + shown.length * ROW_H} className={s.note}>+{procs.length - shown.length} más</text>
      )}
    </>
  );
}

/** Una fila por variable condicion: su nombre y el primero de su cola (o "vacía"). */
function CondRows({ monitor, x, y }: { monitor: MonitorView; x: number; y: number }) {
  if (monitor.conds.length === 0) return <text x={x} y={y} className={s.note}>sin variables cond</text>;
  // primero las que tienen a alguien esperando: son las que hay que ver
  const ordered = [...monitor.conds].sort((a, b) => Number(b.queue.length > 0) - Number(a.queue.length > 0));
  const shown = ordered.length > ROWS ? ordered.slice(0, ROWS - 1) : ordered;
  return (
    <>
      {shown.map((c, i) => {
        const first = c.queue[0];
        const rowY = y + i * ROW_H;
        return (
          <g key={c.name}>
            <text x={x} y={rowY} className={s.condName}>{fit(c.name, 8)}</text>
            {first ? (
              <>
                <circle cx={x + 55} cy={rowY - 4} r="3.5" fill={first.color} />
                <text x={x + 62} y={rowY} className={s.procName}>
                  {fit(first.name, 7)}{c.queue.length > 1 ? ` +${c.queue.length - 1}` : ''}
                </text>
              </>
            ) : (
              <text x={x + 52} y={rowY} className={s.note}>vacía</text>
            )}
          </g>
        );
      })}
      {ordered.length > shown.length && (
        <text x={x} y={y + shown.length * ROW_H} className={s.note}>+{ordered.length - shown.length} cond más</text>
      )}
    </>
  );
}
