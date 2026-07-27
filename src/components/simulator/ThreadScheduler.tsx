import React from 'react';
import type { Thread, SemaphoreSnapshot } from '../../engine/vm';

interface ThreadSchedulerProps {
  threads: Thread[];
  semaphores: Record<string, SemaphoreSnapshot>;
}

const getStateConfig = (state: string) => {
  switch (state) {
    case 'RUNNING':
      return {
        label: 'RUNNING',
        bg: 'rgba(78, 201, 176, 0.15)',
        color: '#4ec9b0',
        border: '#4ec9b0',
      };
    case 'READY':
      return {
        label: 'READY',
        bg: 'rgba(133, 133, 133, 0.12)',
        color: '#858585',
        border: 'transparent',
      };
    case 'BLOCKED':
      return {
        label: 'BLOCKED',
        bg: 'rgba(204, 167, 0, 0.15)',
        color: '#cca700',
        border: 'transparent',
      };
    case 'TERMINATED':
      return {
        label: 'TERMINATED',
        bg: 'rgba(244, 135, 113, 0.12)',
        color: '#f48771',
        border: 'transparent',
      };
    default:
      return {
        label: state,
        bg: 'rgba(133, 133, 133, 0.12)',
        color: '#858585',
        border: 'transparent',
      };
  }
};

export const ThreadScheduler: React.FC<ThreadSchedulerProps> = ({ threads, semaphores }) => {
  const groupedThreads = {
    RUNNING: threads.filter(t => t.state === 'RUNNING'),
    READY: threads.filter(t => t.state === 'READY'),
    BLOCKED: threads.filter(t => t.state === 'BLOCKED'),
    TERMINATED: threads.filter(t => t.state === 'TERMINATED'),
  };

  const renderGroup = (title: string, group: Thread[]) => {
    if (group.length === 0) return null;
    return (
      <div style={{ marginBottom: '1rem' }}>
        <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>{title} ({group.length})</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {group.map(t => {
            const cfg = getStateConfig(t.state);
            const isRunning = t.state === 'RUNNING';
            
            let blockedText = '';
            if (t.state === 'BLOCKED') {
              for (const [semName, sem] of Object.entries(semaphores)) {
                if (sem.blockedQueue.some(b => b.id === t.id)) {
                  blockedText = ` (${semName})`;
                  break;
                }
              }
            }

            return (
              <div
                key={t.id}
                className={`scheduler-thread-card${isRunning ? ' scheduler-thread-running' : ''}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem 0.75rem',
                  background: isRunning ? 'rgba(78, 201, 176, 0.08)' : 'rgba(0,0,0,0.2)',
                  borderRadius: '6px',
                  borderLeft: `4px solid ${isRunning ? cfg.border : t.color}`,
                  transition: 'all 0.25s ease',
                  transform: isRunning ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isRunning ? `0 0 12px rgba(78, 201, 176, 0.25), inset 0 0 20px rgba(78, 201, 176, 0.05)` : 'none',
                  opacity: t.state === 'TERMINATED' ? 0.4 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isRunning && (
                    <span className="running-indicator" />
                  )}
                  <span style={{ color: t.color, fontWeight: 'bold', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>{t.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>(ID: {t.id})</span>
                </div>
                <div style={{
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  backgroundColor: cfg.bg,
                  color: cfg.color,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.05em',
                  border: isRunning ? `1px solid rgba(78, 201, 176, 0.3)` : '1px solid transparent',
                }}>
                  {cfg.label}{blockedText}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="glass-panel panel">
      <div className="panel-header">Scheduler</div>
      <div className="panel-content">
        {threads.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', marginTop: '2rem' }}>
            No hay hilos en ejecución.
          </div>
        ) : (
          <div>
            {renderGroup('RUNNING', groupedThreads.RUNNING)}
            {renderGroup('READY', groupedThreads.READY)}
            {renderGroup('BLOCKED', groupedThreads.BLOCKED)}
            {renderGroup('TERMINATED', groupedThreads.TERMINATED)}
          </div>
        )}
      </div>
    </div>
  );
};
