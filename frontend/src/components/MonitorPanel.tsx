import { useMemo } from 'react';
import { MonitorDiagram } from './MonitorDiagram';
import { useAhora } from '../useAhora';
import type { LogEntry, ProcessView, Snapshot } from '../types';

interface Props {
  readonly snapshot: Snapshot | null;
  /** Eventos del ultimo paso. */
  readonly entries: readonly LogEntry[];
}

/** Un dibujo por monitor, como el de la teoria: 1 espera acceso, 2 cola por cond, 3 ejecutando. */
export function MonitorPanel({ snapshot, entries }: Props) {
  const processes = useMemo(() => {
    const m = new Map<number, ProcessView>();
    for (const p of snapshot?.processes ?? []) m.set(p.id, p);
    return m;
  }, [snapshot]);
  const ahora = useAhora(snapshot?.processes.some((p) => p.delayEndsAt !== null) ?? false);

  return (
    <aside className="monitores" aria-label="Monitores">
      <header title="1: espera acceso al monitor · 2: cola por variable condición · 3: ejecutando en el monitor">
        monitores
      </header>
      <div className="lista">
        {snapshot?.monitors.map((m) => (
          <MonitorDiagram key={m.name} monitor={m} processes={processes} entries={entries}
            ahora={ahora} />
        ))}
      </div>
    </aside>
  );
}
