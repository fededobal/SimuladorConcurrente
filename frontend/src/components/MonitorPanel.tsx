import { useMemo } from 'react';
import { MonitorDiagram } from './MonitorDiagram';
import { useAhora } from '../useAhora';
import type { LogEntry, ProcessView, Snapshot } from '../types';

interface Props {
  readonly snapshot: Snapshot | null;
  /** Eventos del ultimo paso. */
  readonly entries: readonly LogEntry[];
}

/** Columna con un dibujo por monitor, como el de la teoria. */
export function MonitorPanel({ snapshot, entries }: Props) {
  const processes = useMemo(() => {
    const m = new Map<number, ProcessView>();
    for (const p of snapshot?.processes ?? []) m.set(p.id, p);
    return m;
  }, [snapshot]);
  const hayDelay = snapshot?.processes.some((p) => p.delayEndsAt !== null) ?? false;
  const ahora = useAhora(hayDelay);

  return (
    <aside className="monitores">
      <header>
        monitores
        <span className="leyenda">
          <span className="mon-z z1">1</span> espera acceso
          <span className="mon-z z2">2</span> cola por variable condición
          <span className="mon-z z3">3</span> ejecutando
        </span>
      </header>
      <div className="lista">
        {!snapshot ? (
          <p className="vacio">Ejecutá o avanzá un paso para ver cada monitor.</p>
        ) : snapshot.monitors.length === 0 ? (
          <p className="vacio">El programa no tiene monitores.</p>
        ) : (
          snapshot.monitors.map((m) => (
            <MonitorDiagram key={m.name} monitor={m} processes={processes} entries={entries}
              ahora={ahora} />
          ))
        )}
      </div>
    </aside>
  );
}
