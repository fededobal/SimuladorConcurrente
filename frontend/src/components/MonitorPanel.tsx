import { useMemo } from 'react';
import { DeadlockTable } from './DeadlockTable';
import { ExpandButton } from './ExpandButton';
import { MonitorDiagram } from './MonitorDiagram';
import type { BlockedProcess } from '../deadlock';
import type { LogEntry, ProcessView, Snapshot } from '../types';

interface Props {
  readonly snapshot: Snapshot | null;
  /** Eventos del ultimo paso. */
  readonly entries: readonly LogEntry[];
  /** Procesos bloqueados si la simulacion termino en interbloqueo; vacio si no. */
  readonly blocked: readonly BlockedProcess[];
  /** Ampliado al costado del editor: cada monitor se muestra en su version extendida. */
  readonly expanded: boolean;
  readonly onToggleExpand: () => void;
}

/** Un dibujo por monitor, como el de la teoria: 1 espera acceso, 2 cola por cond, 3 ejecutando. */
export function MonitorPanel({ snapshot, entries, blocked, expanded, onToggleExpand }: Props) {
  const processes = useMemo(() => {
    const m = new Map<number, ProcessView>();
    for (const p of snapshot?.processes ?? []) m.set(p.id, p);
    return m;
  }, [snapshot]);

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
        {!snapshot && (
          <p className="panel-vacio">
            Con Ejecutar o Paso, acá se dibuja cada monitor con sus colas de procesos y sus variables.
          </p>
        )}
        {snapshot?.monitors.length === 0 && (
          <p className="panel-vacio">El programa no declara monitores.</p>
        )}
        {snapshot?.monitors.map((m) => (
          <MonitorDiagram key={m.name} monitor={m} processes={processes} entries={entries}
            onExpand={expanded ? undefined : onToggleExpand} />
        ))}
        <DeadlockTable blocked={blocked} />
      </div>
    </aside>
  );
}
