import { Lock, Unlock } from 'lucide-react';
import type { ProcRef, Snapshot, VarView } from '../types';

function VarRow({ v }: { v: VarView }) {
  return (
    <div
      className="var-row"
      style={{ borderLeftColor: v.lastWriterId != null ? 'var(--accent)' : 'transparent' }}
    >
      <span className="vname">{v.name}</span>
      <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
        <span className="vtype">{v.type}</span>
        <span className="vval">{v.value}</span>
      </span>
    </div>
  );
}

function Chips({ procs }: { procs: ProcRef[] }) {
  if (procs.length === 0) return <span className="muted">vacía</span>;
  return (
    <>
      {procs.map((p, i) => (
        <span key={`${p.id}-${i}`} className="proc-chip">
          <span className="proc-dot" style={{ background: p.color }} />
          {p.name}
        </span>
      ))}
    </>
  );
}

export function MonitorsPanel({ snapshot }: { snapshot: Snapshot | null }) {
  if (!snapshot) {
    return (
      <div className="panel">
        <div className="panel-header">Monitores</div>
        <div className="panel-body">
          <p className="empty-hint">Compilá y ejecutá para ver el estado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">Monitores</div>
      <div className="panel-body">
        {snapshot.monitors.map((m) => (
          <div className="mon-card" key={m.name}>
            <header>
              <span className="name">monitor {m.name}</span>
              {m.lockOwner ? (
                <span className="lock-badge lock-held">
                  <Lock size={12} /> {m.lockOwner.name}
                </span>
              ) : (
                <span className="lock-badge lock-free">
                  <Unlock size={12} /> libre
                </span>
              )}
            </header>

            {m.vars.length > 0 && (
              <div className="mon-section">
                <h4>Variables permanentes</h4>
                {m.vars.map((v) => (
                  <VarRow key={v.name} v={v} />
                ))}
              </div>
            )}

            {m.conds.length > 0 && (
              <div className="mon-section">
                <h4>Variables condición</h4>
                {m.conds.map((c) => (
                  <div className="cond-row" key={c.name}>
                    <span className="cond-name">{c.name}</span>
                    <div className="queue-line">
                      <span className="queue-label">cola:</span>
                      <Chips procs={c.queue} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mon-section">
              <h4>Cola de entrada</h4>
              <div className="queue-line">
                <Chips procs={m.entryQueue} />
              </div>
            </div>
          </div>
        ))}

        {snapshot.constants.length > 0 && (
          <div className="mon-card">
            <header>
              <span className="name">constantes globales</span>
            </header>
            <div className="mon-section">
              {snapshot.constants.map((v) => (
                <VarRow key={v.name} v={v} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
