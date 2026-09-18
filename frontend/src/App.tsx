import { useEffect, useMemo, useState } from 'react';
import { Link, Play, Pause, SkipForward, Square } from 'lucide-react';
import { CodeEditor, type ActiveLine } from './components/CodeEditor';
import { OutputPanel } from './components/OutputPanel';
import { useSimulation, type SimStatus } from './useSimulation';
import { EJEMPLOS } from './ejemplos';
import type { SchedulingPolicy } from './types';
import { enlaceCompartido, leerCompartido } from './compartir';

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
  const { setCode, setFixedSeed, setPolicy } = sim;
  const [aviso, setAviso] = useState<string | null>(null);

  // Al abrir un enlace compartido: cargar programa, semilla y politica, y limpiar la URL
  // para que al recargar no vuelva a pisar lo que el alumno haya editado.
  useEffect(() => {
    let vigente = true;
    leerCompartido(window.location.hash).then((c) => {
      if (!vigente || !c) return;
      setCode(c.codigo);
      setFixedSeed(c.semilla);
      setPolicy(c.politica);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    });
    return () => { vigente = false; };
  }, [setCode, setFixedSeed, setPolicy]);

  useEffect(() => {
    if (aviso === null) return;
    const t = window.setTimeout(() => setAviso(null), 2500);
    return () => window.clearTimeout(t);
  }, [aviso]);

  const compartir = async () => {
    const url = await enlaceCompartido({
      codigo: sim.code,
      semilla: sim.fixedSeed ?? sim.lastSeed,
      politica: sim.policy,
    });
    try {
      await navigator.clipboard.writeText(url);
      setAviso('enlace copiado');
    } catch {
      window.history.replaceState(null, '', url);
      setAviso('copiá el enlace de la barra de direcciones');
    }
  };

  const activeLines: ActiveLine[] = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.processes
      .filter((p) => p.line > 0 && p.state !== 'TERMINATED')
      .map((p) => ({ line: p.line, color: p.color, state: p.state, name: p.name }));
  }, [snapshot]);

  const running = status === 'running';
  const active = status !== 'idle' && status !== 'error';

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

        <input
          className="sel seed-in"
          inputMode="numeric"
          placeholder="semilla al azar"
          value={sim.fixedSeed ?? ''}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 9);
            sim.setFixedSeed(v === '' ? null : Number(v));
          }}
          disabled={running}
          aria-label="Semilla fija (vacío: una nueva en cada corrida)"
          title="Vacío: cada corrida usa una semilla nueva. Con un número: todas las corridas repiten el mismo entrelazado."
        />

        <button
          className="btn"
          onClick={compartir}
          title="Copia un enlace con el programa, la semilla y la política. Quien lo abra ve la misma corrida."
        >
          <Link size={14} /> Compartir
        </button>

        <div className="spacer" />

        <div className="meta">
          {aviso && <span className="st">{aviso}</span>}
          <span className={`st${status === 'deadlock' || status === 'error' ? ' bad' : ''}`}>
            {STATUS_LABEL[status]}
          </span>
          {sim.lastSeed !== null && (
            <button
              className="seed"
              onClick={() => sim.setFixedSeed(sim.lastSeed)}
              disabled={running || sim.fixedSeed === sim.lastSeed}
              title="Fijar esta semilla para repetir la misma corrida"
            >
              semilla {sim.lastSeed}
            </button>
          )}
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
            errorLine={status === 'error' ? sim.error?.line ?? null : null}
            pasoMs={sim.speed}
          />
          {status === 'error' && sim.error && (
            <div className="err">
              {sim.error.line != null ? `línea ${sim.error.line}: ` : ''}
              {sim.error.message.replace(/^Linea \d+:\s*/, '')}
            </div>
          )}
        </div>

        <OutputPanel lines={snapshot?.output ?? []} />
      </div>
    </div>
  );
}
