import React from 'react';
import { Cpu } from 'lucide-react';
interface HeaderProps {
  onStart: (startPaused?: boolean) => void;
  onStop: () => void;
  onPauseResume: () => void;
  onStep: () => void;

  speed: number;
  onSpeedChange: (s: number) => void;

  isRunning: boolean;
  isPaused: boolean;
}

// Icons as SVG components
const PlayIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const PauseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const StopIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
  </svg>
);

const StepIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 4 15 12 5 20 5 4" />
    <line x1="19" y1="5" x2="19" y2="19" />
  </svg>
);

const TimerIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="13" r="8" />
    <polyline points="12 9 12 13 14 15" />
    <line x1="12" y1="2" x2="12" y2="4" />
    <line x1="10" y1="2" x2="14" y2="2" />
  </svg>
);

export const Header: React.FC<HeaderProps> = ({
  onStart, onStop, onPauseResume, onStep, speed, onSpeedChange, isRunning, isPaused
}) => {
  return (
    <header className="dashboard-header">
      {/* Brand Identity */}
      <div className="header-brand">
        <Cpu size={24} color="#60a5fa" />
        <h1>
          <span className="fw-light">Simulador</span>
          <span className="fw-bold">Concurrente</span>
        </h1>
      </div>

      {/* Controls Area */}
      <div className="header-controls">

        {/* Speed Control */}
        <div className="speed-control-group">
          <TimerIcon />
          <select
            className="speed-select"
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
          >
            <option value={1500}>Lento</option>
            <option value={1000}>Normal</option>
            <option value={500}>Rápido</option>
            <option value={100}>Muy Rápido</option>
          </select>
        </div>

        <div className="control-separator"></div>

        {/* Action Buttons */}
        <div className="action-buttons-group">
          <button
            className={`control-btn btn-step ${isRunning && !isPaused ? 'disabled' : ''}`}
            onClick={() => {
              if (!isRunning) onStart(true);
              else onStep();
            }}
            disabled={isRunning && !isPaused}
          >
            <div className="icon-wrapper"><StepIcon /></div>
            <span className="btn-label">Paso a Paso</span>
          </button>

          {!isRunning ? (
            <button className="control-btn btn-play" onClick={() => onStart(false)}>
              <div className="icon-wrapper"><PlayIcon /></div>
              <span className="btn-label">Ejecutar</span>
            </button>
          ) : (
            <>
              <button
                className={`control-btn btn-pause ${isPaused ? 'active' : ''}`}
                onClick={onPauseResume}
              >
                <div className="icon-wrapper">{isPaused ? <PlayIcon /> : <PauseIcon />}</div>
                <span className="btn-label">{isPaused ? 'Continuar' : 'Pausar'}</span>
              </button>

              <button
                className="control-btn btn-stop"
                onClick={onStop}
              >
                <div className="icon-wrapper"><StopIcon /></div>
                <span className="btn-label">Detener</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};