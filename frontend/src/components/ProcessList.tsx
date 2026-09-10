import type { ProcessView, Snapshot } from '../types';

interface Props {
  snapshot: Snapshot | null;
  canPick: boolean;
  onPick: (processId: number) => void;
}

function blockedText(p: ProcessView): string {
  if (p.state !== 'BLOCKED') return p.location ?? '';
  if (p.blockReason === 'COND_WAIT') return `wait en ${p.blockedOn}`;
  return `entrada a ${p.blockedOn}`;
}

export function ProcessList({ snapshot, canPick, onPick }: Props) {
  const procs = snapshot?.processes ?? [];

  return (
    <div className="panel">
      <div className="panel-header">
        Procesos
        {canPick && <span className="muted" style={{ textTransform: 'none' }}>elegí el próximo</span>}
      </div>
      <div className="panel-body">
        {procs.length === 0 && <p className="empty-hint">Sin procesos.</p>}
        {procs.map((p) => {
          const pickable = canPick && p.state === 'READY';
          return (
            <div
              key={p.id}
              className={`proc-item${pickable ? ' pickable' : ''}${p.state === 'RUNNING' ? ' is-running' : ''}`}
              style={{ borderLeftColor: p.color, opacity: p.state === 'TERMINATED' ? 0.5 : 1 }}
              onClick={pickable ? () => onPick(p.id) : undefined}
              title={pickable ? 'Ejecutar este proceso en el próximo paso' : undefined}
            >
              <span className="pname" style={{ color: p.color }}>
                {p.name}
              </span>
              <span className="pmeta">{p.error ?? blockedText(p)}</span>
              <span className={`state-tag state-${p.state}`}>{p.state}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
