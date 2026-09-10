import { Cpu, Play, Pause, SkipForward, RotateCcw, Square } from 'lucide-react';
import type { SchedulingPolicy } from '../types';
import type { SimStatus } from '../useSimulation';

interface Props {
  status: SimStatus;
  instant: number;
  isHistorical: boolean;
  policy: SchedulingPolicy;
  onPolicy: (p: SchedulingPolicy) => void;
  speed: number;
  speeds: readonly number[];
  onSpeed: (s: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  onStop: () => void;
}

const SPEED_LABEL: Record<number, string> = {
  1500: 'Lento',
  1000: 'Normal',
  500: 'Rápido',
  200: 'Muy rápido',
};

const STATUS_LABEL: Record<SimStatus, string> = {
  idle: 'sin compilar',
  ready: 'listo',
  running: 'ejecutando',
  paused: 'pausado',
  finished: 'terminado',
  deadlock: 'deadlock',
  error: 'error',
};

export function Header(p: Props) {
  const running = p.status === 'running';
  const active = p.status !== 'idle' && p.status !== 'error';
  const done = p.status === 'finished' || p.status === 'deadlock';

  return (
    <header className="header">
      <div className="brand">
        <Cpu size={20} color="#569cd6" />
        <span className="light">Simulador</span> Monitores
      </div>

      <div className="controls">
        {running ? (
          <button className="btn" onClick={p.onPause}>
            <Pause size={15} /> Pausar
          </button>
        ) : (
          <button className="btn primary" onClick={p.onPlay} disabled={done}>
            <Play size={15} /> {active ? 'Continuar' : 'Ejecutar'}
          </button>
        )}
        <button className="btn" onClick={p.onStep} disabled={running || done}>
          <SkipForward size={15} /> Paso
        </button>
        <button className="btn" onClick={p.onReset} disabled={!active}>
          <RotateCcw size={15} /> Reiniciar
        </button>
        <button className="btn danger" onClick={p.onStop} disabled={!active}>
          <Square size={15} /> Detener
        </button>
      </div>

      <div className="control-group">
        planificación
        <select
          className="control"
          value={p.policy}
          onChange={(e) => p.onPolicy(e.target.value as SchedulingPolicy)}
        >
          <option value="RANDOM">Aleatoria</option>
          <option value="ROUND_ROBIN">Round-robin</option>
        </select>
      </div>

      <div className="control-group">
        velocidad
        <select className="control" value={p.speed} onChange={(e) => p.onSpeed(Number(e.target.value))}>
          {p.speeds.map((s) => (
            <option key={s} value={s}>
              {SPEED_LABEL[s] ?? `${s}ms`}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span className="instant-badge">
          instante <b>{p.instant}</b>
          {p.isHistorical && <span className="historical-tag"> (histórico)</span>}
        </span>
        <span className={`status-pill status-${p.status}`}>{STATUS_LABEL[p.status]}</span>
      </div>
    </header>
  );
}
