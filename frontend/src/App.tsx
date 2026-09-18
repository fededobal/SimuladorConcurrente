import { useMemo } from 'react';
import { Play, Pause, SkipForward, Square } from 'lucide-react';
import { CodeEditor, type ActiveLine } from './components/CodeEditor';
import { OutputPanel } from './components/OutputPanel';
import { useSimulation, type SimStatus } from './useSimulation';

const DEFAULT_CODE = `monitor Buffer {
  int dato = 0;
  boolean hayDato = false;
  cond libre, ocupado;

  procedure depositar(d: in int) {
    while (hayDato) wait(libre);
    dato = d;
    hayDato = true;
    signal(ocupado);
  }

  procedure retirar(r: out int) {
    while (not hayDato) wait(ocupado);
    r = dato;
    hayDato = false;
    signal(libre);
  }
}

process Productor {
  int i = 1;
  while (i <= 5) {
    Buffer.depositar(i);
    write("deposite ", i);
    i++;
  }
}

process Consumidor {
  int x = 0;
  int n = 0;
  while (n < 5) {
    Buffer.retirar(x);
    write("retire ", x);
    n++;
  }
}
`;

const SPEED_LABEL: Record<number, string> = {
  1200: 'lento',
  600: 'normal',
  300: 'rápido',
  120: 'muy rápido',
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
  const sim = useSimulation(DEFAULT_CODE);
  const { snapshot, status } = sim;

  const activeLines: ActiveLine[] = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.processes
      .filter((p) => p.line > 0 && p.state !== 'TERMINATED')
      .map((p) => ({ line: p.line, color: p.color, state: p.state, name: p.name }));
  }, [snapshot]);

  const running = status === 'running';
  const active = status !== 'idle' && status !== 'error';

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

        <div className="spacer" />

        <div className="meta">
          <span className={`st${status === 'deadlock' || status === 'error' ? ' bad' : ''}`}>
            {STATUS_LABEL[status]}
          </span>
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
