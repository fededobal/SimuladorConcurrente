import { useMemo } from 'react';
import { Play, Pause, SkipForward, Square } from 'lucide-react';
import { CodeEditor, type ActiveLine } from './components/CodeEditor';
import { OutputPanel } from './components/OutputPanel';
import { useSimulation, type SimStatus } from './useSimulation';
import { EJEMPLOS } from './ejemplos';
import { Timeline } from './components/Timeline';
import { visibleState } from './processStates';
import type { SchedulingPolicy } from './types';

const SPEED_LABEL: Record<number, string> = {
  1200: 'lento',
  600: 'normal',
  300: 'rápido',
  120: 'muy rápido',
};

const POLICY_LABEL: Record<SchedulingPolicy, string> = {
  RANDOM: 'turnos al azar',
  ROUND_ROBIN: 'turnos en ronda',
};

const STATUS_LABEL: Record<SimStatus, string> = {
  idle: '',
  ready: 'listo',
  running: 'ejecutando',
  paused: 'en pausa',
  finished: 'fin',
  deadlock: 'deadlock',
  error: 'error',
};

export function App() {
  const sim = useSimulation(EJEMPLOS[0]?.codigo ?? '');
  const { snapshot, status } = sim;

  const activeLines: ActiveLine[] = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.processes
      .filter((p) => p.line > 0 && p.state !== 'TERMINATED')
      .map((p) => ({
        line: p.line, color: p.color, state: visibleState(p, snapshot.monitors), name: p.name,
      }));
  }, [snapshot]);

  // Procesos que terminaron por un error de ejecucion: se muestran con su linea.
  const fallidos = useMemo(
    () => snapshot?.processes.filter((p) => p.error !== null) ?? [],
    [snapshot],
  );
  const errorLines = useMemo(() => {
    if (status === 'error') return sim.error?.line != null ? [sim.error.line] : [];
    return fallidos.filter((p) => p.line > 0).map((p) => p.line);
  }, [status, sim.error, fallidos]);

  const running = status === 'running';
  // un interbloqueo despues de un error no es un problema de sincronizacion del programa
  const etiqueta = fallidos.length === 0 ? STATUS_LABEL[status]
    : status === 'deadlock' ? 'deadlock tras un error'
      : status === 'finished' ? 'fin con errores' : STATUS_LABEL[status];
  const mal = status === 'deadlock' || status === 'error' || fallidos.length > 0;
  // solo se puede detener una simulacion que todavia puede avanzar
  const active = status === 'ready' || status === 'running' || status === 'paused';

  const cargarEjemplo = (id: string) => {
    const ejemplo = EJEMPLOS.find((e) => e.id === id);
    if (!ejemplo) return;
    // Si el editor tiene un programa propio, avisar antes de pisarlo.
    const propio = !EJEMPLOS.some((e) => e.codigo === sim.code);
    if (propio && !window.confirm('Se reemplaza el programa del editor por el ejemplo. ¿Seguir?')) {
      return;
    }
    sim.setCode(ejemplo.codigo);
  };

  return (
    <div className="app">
      <div className="bar">
        {running ? (
          <button className="btn btn-main" onClick={sim.pause}>
            <Pause size={14} /> Pausar
          </button>
        ) : (
          <button className="btn btn-main" onClick={sim.play}>
            <Play size={14} /> Ejecutar
          </button>
        )}

        <button className="btn" onClick={sim.step} disabled={running}>
          <SkipForward size={14} /> Paso
        </button>

        <button className="btn" onClick={sim.stop} disabled={!active}>
          <Square size={14} /> Detener
        </button>

        <select
          className="sel"
          value={sim.speed}
          onChange={(e) => sim.setSpeed(Number(e.target.value))}
        >
          {sim.speeds.map((s) => (
            <option key={s} value={s}>{SPEED_LABEL[s] ?? `${s}ms`}</option>
          ))}
        </select>

        <select
          className="sel"
          value={sim.policy}
          onChange={(e) => sim.setPolicy(e.target.value as SchedulingPolicy)}
          aria-label="Política de planificación"
          title="Al azar: en cada instante avanza un subconjunto aleatorio de los procesos listos. En ronda: avanzan todos los listos, por turno."
        >
          {(Object.keys(POLICY_LABEL) as SchedulingPolicy[]).map((p) => (
            <option key={p} value={p}>{POLICY_LABEL[p]}</option>
          ))}
        </select>

        <select
          className="sel"
          value=""
          onChange={(e) => cargarEjemplo(e.target.value)}
          disabled={running}
          aria-label="Cargar un programa de ejemplo"
        >
          <option value="" disabled>Ejemplos…</option>
          {EJEMPLOS.map((e) => (
            <option key={e.id} value={e.id}>{e.titulo}</option>
          ))}
        </select>

        <div className="spacer" />

        <div className="meta">
          <span className={`st${mal ? ' bad' : ''}`}>{etiqueta}</span>
          <span className="n">{snapshot?.instant ?? 0}</span>
        </div>
      </div>

      <div className="cuerpo">
        <div className="stage">
          <CodeEditor
            code={sim.code}
            onChange={sim.setCode}
            readOnly={running}
            activeLines={activeLines}
            errorLines={errorLines}
            pasoMs={sim.speed}
          />
          {status === 'error' && sim.error && (
            <div className="err">
              {sim.error.line != null ? `línea ${sim.error.line}: ` : ''}
              {sim.error.message.replace(/^L[ií]nea \d+:\s*/, '')}
            </div>
          )}
          {status !== 'error' && fallidos.length > 0 && (
            <div className="err" role="alert">
              {fallidos.map((p) => (
                <div key={p.id}>
                  <span style={{ color: p.color }}>{p.name}</span>
                  {p.line > 0 ? `, línea ${p.line}` : ''}: error de ejecución: {p.error}
                </div>
              ))}
            </div>
          )}
        </div>

        <OutputPanel lines={snapshot?.output ?? []} />
      </div>

      <Timeline timeline={sim.timeline} processes={snapshot?.processes ?? []} />
    </div>
  );
}
