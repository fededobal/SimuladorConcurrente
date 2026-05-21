import React from 'react';
import type { Thread } from '../../engine/vm';

interface ThreadSchedulerProps {
  threads: Thread[];
}

export const ThreadScheduler: React.FC<ThreadSchedulerProps> = ({ threads }) => {
  return (
    <div className="glass-panel panel">
      <div className="panel-header">Scheduler (Estado de Hilos)</div>
      <div className="panel-content">
        {threads.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', marginTop: '2rem' }}>
            No hay hilos en ejecución.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {threads.map(t => (
              <div 
                key={t.id} 
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${t.color}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: t.color, fontWeight: 'bold' }}>{t.name}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>(ID: {t.id})</span>
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  backgroundColor: 
                    t.state === 'READY' ? 'rgba(16, 185, 129, 0.2)' : 
                    t.state === 'BLOCKED' ? 'rgba(245, 158, 11, 0.2)' : 
                    'rgba(239, 68, 68, 0.2)',
                  color: 
                    t.state === 'READY' ? 'var(--success)' : 
                    t.state === 'BLOCKED' ? 'var(--warning)' : 
                    'var(--error)',
                }}>
                  {t.state}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
