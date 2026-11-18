import type { Arrow, Travel } from '../monitorDiagram';
import type { MonitorView, ProcRef } from '../types';
import { useLingering } from '../useLingering';
import s from './MonitorCard.module.css';

interface Props {
  readonly monitor: MonitorView;
  /** Recorridos del ultimo instante: que flechas se usaron y quien las recorrio. */
  readonly travels: readonly Travel[];
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
/** Puntos que recorren una misma flecha a la vez; con mas procesos, el resto no se dibuja. */
const MAX_TRAVELERS = 4;
/** Separacion entre dos puntos que recorren la misma flecha, en ms. */
const TRAVELER_GAP_MS = 70;

/** Trazo de una flecha, donde termina y hacia donde apunta (grados; 0 es hacia la derecha). */
interface ArrowShape {
  readonly d: string;
  readonly tip: readonly [number, number];
  readonly angle: number;
}

const ARROWS: Record<Arrow, ArrowShape> = {
  call: { d: `M2,${MID_Y} L${ZONE1.x - 3},${MID_Y}`, tip: [ZONE1.x - 2, MID_Y], angle: 0 },
  entra: {
    d: `M${ZONE1.x + ZONE_W + 2},${MID_Y} L${ZONE3.x - 3},${MID_Y}`, tip: [ZONE3.x - 2, MID_Y], angle: 0,
  },
  return: { d: `M${ZONE3.x + ZONE_W + 2},${MID_Y} L${W - 2},${MID_Y}`, tip: [W - 1, MID_Y], angle: 0 },
  wait: {
    d: `M${ZONE3.x + 76},${ZONE3.y - 2} C${ZONE3.x + 76},60 ${ZONE3.x + 60},44 ${ZONE2.x + ZONE_W + 4},44`,
    tip: [ZONE2.x + ZONE_W + 3, 44],
    angle: 180,
  },
  signal: {
    d: `M${ZONE2.x - 2},44 C${ZONE1.x + 66},44 ${ZONE1.x + 50},60 ${ZONE1.x + 50},${ZONE1.y - 4}`,
    tip: [ZONE1.x + 50, ZONE1.y - 3],
    angle: 90,
  },
};

function fit(text: string, max = NAME_CHARS): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/**
 * Dibujo de un monitor, como el de la teoria: tres zonas grandes con el nombre completo de
 * cada proceso (no un punto con dos letras) y las flechas entre ellas; la que se recorrio en
 * el ultimo instante queda resaltada.
 *
 * De un instante al otro nada salta: un punto del color del proceso recorre la flecha que
 * uso, el nombre aparece en la zona de llegada cuando el punto esta por llegar, los que
 * quedan en una cola suben a ocupar el lugar libre, y las flechas y las zonas cambian de
 * color con una transicion.
 */
export function MonitorDrawing({ monitor, travels, ownerLine, deadlocked }: Props) {
  const waiting = monitor.conds.reduce((n, c) => n + c.queue.length, 0);
  const active = new Set(travels.map((t) => t.arrow));

  // La punta se dibuja a mano (no con un marcador de SVG) para que cambie de color y de
  // tamano con la misma transicion que el trazo.
  const arrow = (a: Arrow, dead = false) => {
    const { d, tip, angle } = ARROWS[a];
    const on = active.has(a);
    return (
      <>
        <path d={d} className={`${s.arrow}${on ? ` ${s.arrowActive}` : ''}${dead ? ` ${s.arrowDead}` : ''}`} />
        <g transform={`translate(${tip[0]} ${tip[1]}) rotate(${angle})`}>
          <path d="M-7.5,-3.9 L0,0 L-7.5,3.9 z" className={`${s.arrowHead}${on ? ` ${s.arrowHeadActive}` : ''}`} />
        </g>
      </>
    );
  };
  const label = (a: Arrow, text: string, x: number, y: number, anchor: 'start' | 'middle' | 'end') => (
    <text x={x} y={y} textAnchor={anchor}
      className={`${s.arrowLabel}${active.has(a) ? ` ${s.arrowLabelActive}` : ''}`}>
      {text}
    </text>
  );

  return (
    <svg className={s.drawing} viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={describe(monitor)}>
      {arrow('call')}
      {label('call', 'call', 2, MID_Y - 7, 'start')}
      {arrow('entra')}
      {label('entra', 'entra', (ZONE1.x + ZONE_W + ZONE3.x) / 2, MID_Y + 15, 'middle')}
      {arrow('return')}
      {label('return', 'return', W - 2, MID_Y - 7, 'end')}
      {arrow('wait')}
      {label('wait', 'wait', ZONE3.x + 84, 74, 'start')}
      {arrow('signal', deadlocked && waiting > 0)}
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

      <Travelers travels={travels} />
    </svg>
  );
}

/**
 * Los puntos que recorren las flechas usadas en el ultimo instante. Cada uno se monta una
 * sola vez (su clave es el evento que lo causo), recorre su flecha y se desvanece.
 */
function Travelers({ travels }: { travels: readonly Travel[] }) {
  const perArrow = new Map<Arrow, number>();
  return (
    <>
      {travels.map((t) => {
        const turn = perArrow.get(t.arrow) ?? 0;
        perArrow.set(t.arrow, turn + 1);
        if (turn >= MAX_TRAVELERS) return null;
        return (
          <circle key={t.key} r="4.5" className={s.traveler}
            style={{
              offsetPath: `path('${ARROWS[t.arrow].d}')`,
              animationDelay: `${turn * TRAVELER_GAP_MS}ms`,
              fill: t.color ?? undefined,
            }} />
        );
      })}
    </>
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

/**
 * Hasta ROWS nombres con el punto de su color; "nadie" si no hay, "+n más" si sobran. El que
 * deja la zona se desvanece en su lugar mientras los demas suben a ocupar el renglon libre.
 */
function NameRows({ procs, x, y }: { procs: readonly ProcRef[]; x: number; y: number }) {
  const all = useLingering(procs, (p) => p.id);
  if (all.length === 0) return <text x={x} y={y} className={`${s.note} ${s.fadeIn}`}>nadie</text>;
  // con mas nombres que renglones, el ultimo renglon es para el "+n más"
  const rows = procs.length > ROWS ? ROWS - 1 : ROWS;
  return (
    <>
      {/* El renglon de cada fila va en un transform: cuando el primero de la cola se va, los
          demas suben con una transicion en vez de saltar. */}
      {all.filter((r) => r.index < rows).map(({ item: p, leaving, index }) => (
        <g key={p.id} className={`${s.nameRow}${leaving ? ` ${s.leave}` : ''}`}
          style={{ transform: `translateY(${index * ROW_H}px)` }}>
          <circle cx={x + 3} cy={y - 4} r="3.5" fill={p.color} />
          <text x={x + 11} y={y} className={s.procName}>{fit(p.name)}</text>
        </g>
      ))}
      {procs.length > rows && (
        <text x={x} y={y + rows * ROW_H} className={s.note}>+{procs.length - rows} más</text>
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
        return (
          <g key={c.name} className={s.nameRow} style={{ transform: `translateY(${i * ROW_H}px)` }}>
            <text x={x} y={y} className={s.condName}>{fit(c.name, 8)}</text>
            {first ? (
              <g key={first.id} className={s.arrive}>
                <circle cx={x + 55} cy={y - 4} r="3.5" fill={first.color} />
                <text x={x + 62} y={y} className={s.procName}>
                  {fit(first.name, 7)}{c.queue.length > 1 ? ` +${c.queue.length - 1}` : ''}
                </text>
              </g>
            ) : (
              <text x={x + 52} y={y} className={`${s.note} ${s.fadeIn}`}>vacía</text>
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
