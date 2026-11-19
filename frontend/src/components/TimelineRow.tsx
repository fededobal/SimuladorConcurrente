import { textWidth } from '../measureText';
import { STATE_CLASS, STATE_HINT } from '../processStates';
import { processTextColor } from '../processColor';
import type { TimelineColumn } from '../timeline';
import { labelsOf, ownerSegmentsOf, segmentsOf } from '../timelineLayout';
import type { ProcessView } from '../types';
import s from './Timeline.module.css';

interface CommonProps {
  /** Distancia desde arriba de la grilla, en px. */
  readonly top: number;
  /** Ancho de una columna (un instante) y de la columna de nombres, en px. */
  readonly cell: number;
  readonly nameWidth: number;
  readonly columns: readonly TimelineColumn[];
}

interface LaneProps extends CommonProps {
  readonly kind: 'monitor';
  readonly name: string;
  readonly byId: ReadonlyMap<number, ProcessView>;
  /** true si es el ultimo carril: lleva el borde que lo separa de los procesos. */
  readonly last: boolean;
}

interface ProcessProps extends CommonProps {
  readonly kind: 'process';
  readonly process: ProcessView;
  /** true si la fila siguiente es de otra familia de procesos. */
  readonly cut: boolean;
}

/** Tipografia de los rotulos de los tramos; igual a .seg en el modulo CSS. */
const LABEL_FONT = "600 12px 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
/** Margen interno de un tramo a cada lado del rotulo, con su borde. */
const LABEL_PAD = 7;

/** El primer rotulo que entra en un tramo de ese ancho, o vacio si no entra ninguno. */
function labelThatFits(labels: readonly string[], width: number): string {
  return labels.find((l) => width >= textWidth(l, LABEL_FONT) + 2 * LABEL_PAD) ?? '';
}

/** Una fila de la linea de tiempo: el carril de un monitor o la fila de un proceso. */
export function TimelineRow(props: LaneProps | ProcessProps) {
  return props.kind === 'monitor' ? <MonitorLane {...props} /> : <ProcessRow {...props} />;
}

/** Carril de un monitor: quien lo tuvo en cada instante, o "libre". */
function MonitorLane({ name, top, cell, nameWidth, columns, byId, last }: LaneProps) {
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
            key={columns[seg.from].instant}
            className={`${s.seg} ${owner ? s.owner : s.free}${seg.from === columns.length - 1 ? ` ${s.fresh}` : ''}`}
            style={{ left: nameWidth + seg.from * cell + 1, width, background: owner?.color }}
            title={owner ? `${owner.name} tiene ${name}` : `${name} libre`}
          >
            {labelThatFits(owner ? [owner.name] : ['libre'], width)}
          </div>
        );
      })}
    </div>
  );
}

/** Fila de un proceso: un tramo por cada racha de instantes en el mismo estado y lugar. */
function ProcessRow({ process: p, top, cell, nameWidth, columns, cut }: ProcessProps) {
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
            key={columns[seg.from].instant}
            className={`${s.seg} ${STATE_CLASS[seg.state]}${seg.from === columns.length - 1 ? ` ${s.fresh}` : ''}`}
            style={{ left: nameWidth + seg.from * cell + 1, width }}
            title={labels[0]}
          >
            {labelThatFits(labels, width)}
          </div>
        );
      })}
    </div>
  );
}
