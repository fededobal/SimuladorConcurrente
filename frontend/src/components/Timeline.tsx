import { useMemo } from 'react';
import type { LogEntry, ProcessState } from '../types';

interface Props {
  entries: LogEntry[];
  viewIndex: number;
  onHover: (index: number | null) => void;
}

const CELL_COLORS: Record<ProcessState, (color: string) => string> = {
  RUNNING: (c) => c,
  READY: () => 'rgba(133,133,133,0.28)',
  BLOCKED: () => 'rgba(204,167,0,0.45)',
  TERMINATED: () => 'transparent',
};

export function Timeline({ entries, viewIndex, onHover }: Props) {
  const { procs, maxInstant, idxByInstant } = useMemo(() => {
    const idxByInstant = new Map<number, number>();
    entries.forEach((e, i) => idxByInstant.set(e.instant, i));
    const last = entries[entries.length - 1];
    return {
      procs: last?.snapshot.processes ?? [],
      maxInstant: last?.instant ?? 0,
      idxByInstant,
    };
  }, [entries]);

  const viewInstant = entries[viewIndex]?.instant ?? -1;

  if (procs.length === 0) {
    return (
      <div className="panel">
        <div className="panel-header">Línea de tiempo</div>
        <div className="panel-body">
          <p className="empty-hint">La ejecución se dibuja instante a instante.</p>
        </div>
      </div>
    );
  }

  const instants = Array.from({ length: maxInstant }, (_, i) => i + 1);

  const stateAt = (procId: number, instant: number): ProcessState => {
    let idx = idxByInstant.get(instant);
    if (idx == null) {
      for (let t = instant; t >= 0; t--) {
        const j = idxByInstant.get(t);
        if (j != null) { idx = j; break; }
      }
    }
    if (idx == null) return 'READY';
    const sp = entries[idx].snapshot.processes.find((p) => p.id === procId);
    return sp?.state ?? 'READY';
  };

  return (
    <div className="panel">
      <div className="panel-header">
        Línea de tiempo
        <div className="legend">
          <span><i style={{ background: '#4ec9b0' }} /> ejecutando</span>
          <span><i style={{ background: 'rgba(204,167,0,0.5)' }} /> bloqueado</span>
          <span><i style={{ background: 'rgba(133,133,133,0.3)' }} /> listo</span>
        </div>
      </div>
      <div className="timeline-scroll" onMouseLeave={() => onHover(null)}>
        <div className="tl-grid">
          <div className="tl-axis">
            {instants.map((t) => (
              <div className="tl-tick" key={t}>
                {t % 5 === 0 ? t : ''}
              </div>
            ))}
          </div>
          {procs.map((proc) => (
            <div className="tl-row" key={proc.id}>
              <div className="tl-name" style={{ color: proc.color }}>
                {proc.name}
              </div>
              <div className="tl-track">
                {instants.map((t) => {
                  const st = stateAt(proc.id, t);
                  return (
                    <div
                      key={t}
                      className={`tl-cell${t === viewInstant ? ' sel' : ''}`}
                      style={{ background: CELL_COLORS[st](proc.color), opacity: st === 'RUNNING' ? 0.9 : 1 }}
                      title={`${proc.name} — instante ${t}: ${st}`}
                      onMouseEnter={() => {
                        const j = idxByInstant.get(t);
                        if (j != null) onHover(j);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
