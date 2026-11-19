import { useMemo, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { DeadlockTable } from './DeadlockTable';
import { MonitorCard } from './MonitorCard';
import { MonitorGroupPanel } from './MonitorGroupPanel';
import { OutputPanel } from './OutputPanel';
import { ProcessList } from './ProcessList';
import type { BlockedProcess } from '../deadlock';
import { eventsAbout } from '../monitorDiagram';
import { groupMonitors } from '../monitorGroups';
import { slideMs, travelMs } from '../motion';
import { useChangeCount } from '../useChangeCount';
import type { LogEntry, MonitorView, ProcessView, ProcRef, Snapshot } from '../types';
import s from './Inspector.module.css';

type TabId = 'monitors' | 'processes' | 'output';

interface Props {
  readonly snapshot: Snapshot | null;
  /** Eventos del ultimo instante. */
  readonly entries: readonly LogEntry[];
  /** Procesos bloqueados si la simulacion termino en deadlock; vacio si no. */
  readonly blocked: readonly BlockedProcess[];
  readonly running: boolean;
  /** Duracion de un instante, en ms: las animaciones se acompasan a la simulacion. */
  readonly pasoMs: number;
  /** true si el panel esta ensanchado. */
  readonly wide: boolean;
  readonly onToggleWide: () => void;
  readonly onStepProcess: (processId: number) => void;
}

const TAB_LABEL: Record<TabId, string> = {
  monitors: 'Monitores',
  processes: 'Procesos',
  output: 'Salida',
};

/**
 * Panel de la derecha. Monitores, Procesos y Salida son pestanas del mismo panel: la salida
 * ya no tapa a los monitores ni a la linea de tiempo, y se puede pasar de una a otra sin
 * perder de vista el codigo.
 */
export function Inspector({
  snapshot, entries, blocked, running, pasoMs, wide, onToggleWide, onStepProcess,
}: Props) {
  const [tab, setTab] = useState<TabId>('monitors');
  // monitor elegido en el selector de cada vector de monitores, por nombre del vector; vive
  // aca y no en el panel del vector para que no se pierda al cambiar de pestana
  const [picked, setPicked] = useState<Readonly<Record<string, string | null>>>({});
  const processes = snapshot?.processes;

  const byId = useMemo(() => {
    const map = new Map<number, ProcessView>();
    for (const p of processes ?? []) map.set(p.id, p);
    return map;
  }, [processes]);

  // Nombre y color por id. No cambian durante una ejecucion: el mapa se conserva mientras
  // los procesos sean los mismos, para no invalidar las tarjetas memorizadas en cada paso.
  const refsKey = (processes ?? []).map((p) => `${p.id}:${p.name}:${p.color}`).join('|');
  const procRefs = useMemo(() => {
    const map = new Map<number, ProcRef>();
    for (const p of processes ?? []) map.set(p.id, { id: p.id, name: p.name, color: p.color });
    return map;
    // refsKey resume lo unico de `processes` que usa el mapa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refsKey]);

  const monitorCard = (m: MonitorView) => (
    <MonitorCard key={m.name} monitor={m}
      owner={m.lockOwner ? byId.get(m.lockOwner.id) : undefined}
      events={eventsAbout(m, entries)} procRefs={procRefs}
      deadlocked={blocked.length > 0} />
  );

  const counts: Record<TabId, number> = {
    monitors: snapshot?.monitors.length ?? 0,
    processes: processes?.length ?? 0,
    output: snapshot?.output.length ?? 0,
  };

  return (
    <aside className={s.inspector} aria-label="Inspector"
      style={{ ['--desliz' as string]: `${slideMs(pasoMs)}ms`, ['--viaje' as string]: `${travelMs(pasoMs)}ms` }}>
      <div className={s.tabs} role="tablist" aria-label="Qué mirar">
        {(Object.keys(TAB_LABEL) as TabId[]).map((id) => (
          <button key={id} type="button" role="tab" id={`tab-${id}`} aria-selected={tab === id}
            aria-controls="inspector-panel"
            className={`${s.tab}${tab === id ? ` ${s.tabActive}` : ''}`} onClick={() => setTab(id)}>
            {TAB_LABEL[id]}
            {snapshot && <Count value={counts[id]} />}
          </button>
        ))}
        <div className={s.tabsEnd}>
          <button type="button" className="btn btn-icono btn-plano btn-chico" onClick={onToggleWide}
            aria-pressed={wide} aria-label={wide ? 'Volver el panel a su ancho' : 'Ensanchar el panel'}
            title={wide ? 'Volver el panel a su ancho' : 'Ensanchar el panel'}>
            {wide ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* la clave es la pestana: al cambiar, el contenido entra con un fundido */}
      <div key={tab} className={s.body} role="tabpanel" id="inspector-panel" aria-labelledby={`tab-${tab}`}>
        {!snapshot && tab !== 'output' && (
          <p className="panel-vacio">
            {tab === 'monitors'
              ? 'Con Ejecutar o Paso, acá se dibuja cada monitor con sus colas de procesos y sus variables.'
              : 'Con Ejecutar o Paso, acá se lista cada proceso con lo que está haciendo y sus variables locales.'}
          </p>
        )}

        {tab === 'monitors' && snapshot && (
          <>
            {snapshot.monitors.length === 0 && (
              <p className="panel-vacio">El programa no declara monitores.</p>
            )}
            {groupMonitors(snapshot.monitors).map((g) => (g.isArray ? (
              <MonitorGroupPanel key={`${g.name}[]`} group={g} picked={picked[g.name] ?? null}
                onPick={(name) => setPicked((prev) => ({ ...prev, [g.name]: name }))}
                renderCard={monitorCard} />
            ) : monitorCard(g.monitors[0])))}
            <DeadlockTable blocked={blocked} />
          </>
        )}

        {tab === 'processes' && snapshot && (
          <>
            <ProcessList processes={snapshot.processes} running={running} onStep={onStepProcess} />
            <DeadlockTable blocked={blocked} />
          </>
        )}

        {tab === 'output' && <OutputPanel lines={snapshot?.output ?? []} />}
      </div>
    </aside>
  );
}

/** Contador de una pestana; cuando cambia da un saltito, para que se note desde otra pestana. */
function Count({ value }: { value: number }) {
  const changes = useChangeCount(value);
  return <span key={changes} className={`${s.count}${changes > 0 ? ` ${s.countPop}` : ''}`}>{value}</span>;
}
