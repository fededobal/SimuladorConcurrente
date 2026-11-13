import { useMemo } from 'react';
import { ExpandButton } from './ExpandButton';
import { MonitorDiagram } from './MonitorDiagram';
import { useAhora } from '../useAhora';
import type { LogEntry, ProcessView, Snapshot } from '../types';

interface Props {
  readonly snapshot: Snapshot | null;
  /** Eventos del ultimo paso. */
  readonly entries: readonly LogEntry[];
  /** Ampliado al costado del editor: cada monitor se muestra en su version extendida. */
  readonly expanded: boolean;
  readonly onToggleExpand: () => void;
}

/** Un dibujo por monitor, como el de la teoria: 1 espera acceso, 2 cola por cond, 3 ejecutando. */
export function MonitorPanel({ snapshot, entries, expanded, onToggleExpand }: Props) {
  const processes = useMemo(() => {
    const m = new Map<number, ProcessView>();
    for (const p of snapshot?.processes ?? []) m.set(p.id, p);
    return m;
  }, [snapshot]);
  const ahora = useAhora(snapshot?.processes.some((p) => p.delayEndsAt !== null) ?? false);

  return (
    <aside className={`monitores tarjeta${expanded ? ' extendido' : ''}`} aria-label="Monitores">
      <header className="panel-head">
        <span
          className="titulo"
          title="Compitiendo: espera acceso al monitor · En wait: dormido en una variable condición · En monitor: ejecutando con el monitor tomado"
        >
          Monitores
        </span>
        <ExpandButton expanded={expanded} onClick={onToggleExpand} />
      </header>
      <div className="lista">
        {snapshot?.monitors.map((m) => (
          <MonitorDiagram key={m.name} monitor={m} processes={processes} entries={entries}
            ahora={ahora} onExpand={expanded ? undefined : onToggleExpand} />
        ))}
      </div>
    </aside>
  );
}
