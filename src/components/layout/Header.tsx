import React from 'react';

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

export const Header: React.FC<HeaderProps> = ({ 
  onStart, onStop, onPauseResume, onStep, speed, onSpeedChange, isRunning, isPaused 
}) => {
  return (
    <header className="glass-panel header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h1>Simulador Concurrente (UNLP)</h1>
      
      <div className="controls" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        
        {/* Selector de Velocidad */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
          <label htmlFor="speed-select" style={{ fontSize: '0.9rem' }}>Velocidad:</label>
          <select 
            id="speed-select"
            value={speed} 
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            style={{ 
              background: 'rgba(255,255,255,0.1)', 
              color: 'white', 
              border: 'none', 
              padding: '4px 8px', 
              borderRadius: '4px',
              outline: 'none'
            }}
          >
            <option style={{ background: '#1e293b' }} value={1500}>Lento</option>
            <option style={{ background: '#1e293b' }} value={1000}>Normal</option>
            <option style={{ background: '#1e293b' }} value={500}>Rápido</option>
            <option style={{ background: '#1e293b' }} value={100}>Muy Rápido</option>
          </select>
        </div>

        {/* Botón Unificado de Paso a Paso */}
        <button 
          onClick={() => {
            if (!isRunning) {
              onStart(true);
            } else {
              onStep();
            }
          }} 
          disabled={isRunning && !isPaused}
          style={{ 
            background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px',
            cursor: (isRunning && !isPaused) ? 'not-allowed' : 'pointer', 
            opacity: (isRunning && !isPaused) ? 0.5 : 1, 
            fontWeight: 'bold', boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
          }}
        >
          ⏭ Paso a Paso
        </button>

        {/* Botones de Control */}
        {!isRunning ? (
          <button className="btn-run" onClick={() => onStart(false)}>
            ▶ Ejecutar
          </button>
        ) : (
          <>
            <button 
              onClick={onPauseResume} 
              style={{ 
                background: isPaused ? '#10b981' : '#f59e0b', 
                color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              {isPaused ? '▶ Continuar' : '⏸ Pausar'}
            </button>
            
            <button 
              onClick={onStop} 
              style={{ 
                background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ⏹ Detener
            </button>
          </>
        )}
      </div>
    </header>
  );
};