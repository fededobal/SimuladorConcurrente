import React, { useEffect, useState } from 'react';
import type { VMState, VariableSnapshot, SemaphoreSnapshot } from '../../engine/vm';

interface VariableTrackerProps {
  state: VMState | null;
  isHistorical: boolean;
}

export const VariableTracker: React.FC<VariableTrackerProps> = ({ state, isHistorical }) => {
  if (!state) return (
    <div className="glass-panel panel">
      <div className="panel-header">Variables</div>
      <div className="panel-content" style={{ opacity: 0.5 }}>Esperando simulación...</div>
    </div>
  );

  return (
    <div className="glass-panel panel" style={{ opacity: isHistorical ? 0.7 : 1, transition: 'opacity 0.2s' }}>
      <div className="panel-header">
        Variables {isHistorical && <span style={{color: '#f59e0b', fontSize: '0.8rem'}}> (Snapshot Histórico)</span>}
      </div>
      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* Render variables enteras */}
        {Object.entries(state.variables).length > 0 && (
          <div className="vars-section">
            <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Variables compartidas</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
              {Object.entries(state.variables).map(([name, data]) => (
                <VariableCard key={name} name={name} data={data} isHistorical={isHistorical} />
              ))}
            </div>
          </div>
        )}

        {/* Render semáforos */}
        {Object.entries(state.semaphores).length > 0 && (
          <div className="sems-section">
            <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Semáforos</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.entries(state.semaphores).map(([name, data]) => (
                <SemaphoreCard key={name} name={name} data={data} isHistorical={isHistorical} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

const VariableCard = ({ name, data, isHistorical }: { name: string, data: VariableSnapshot, isHistorical: boolean }) => {
  const [flash, setFlash] = useState(false);
  const color = data.lastModifiedBy?.color || '#3b82f6'; // Azul por defecto

  useEffect(() => {
    if (!isHistorical) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 500);
      return () => clearTimeout(timer);
    }
  }, [data.value, isHistorical]);

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: `1px solid ${flash ? color : 'rgba(255,255,255,0.1)'}`,
      borderRadius: '6px',
      padding: '0.75rem',
      boxShadow: flash ? `0 0 10px ${color}` : 'none',
      transition: 'all 0.5s ease'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ paddingRight: '5px', fontWeight: 'bold' }}>{name}</span>
        {data.lastModifiedBy && (
          <span style={{ 
            fontSize: '0.7rem', 
            background: data.lastModifiedBy.color, 
            color: '#fff', 
            padding: '2px 4px', 
            borderRadius: '4px' 
          }}>
            {data.lastModifiedBy.name}
          </span>
        )}
      </div>
      <div style={{ marginTop: '0.5rem', fontSize: '1.2rem', fontFamily: 'monospace' }}>
        {String(data.value)} 
        {data.value !== data.previousValue && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '4px' }}>
            (← {String(data.previousValue)})
          </span>
        )}
      </div>
    </div>
  );
};

const SemaphoreCard = ({ name, data, isHistorical }: { name: string, data: SemaphoreSnapshot, isHistorical: boolean }) => {
  const [flash, setFlash] = useState(false);
  const color = data.lastModifiedBy?.color || '#10b981'; // Verde por defecto

  useEffect(() => {
    if (!isHistorical) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 500);
      return () => clearTimeout(timer);
    }
  }, [data.value, data.blockedQueue.length, isHistorical]);

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: `1px solid ${flash ? color : 'rgba(255,255,255,0.1)'}`,
      borderRadius: '6px',
      padding: '0.75rem',
      boxShadow: flash ? `0 0 10px ${color}` : 'none',
      transition: 'all 0.5s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    }}>
      {/* Contador */}
      <div style={{ flex: '0 0 auto', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '1rem' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '0.2rem' }}>sem {name}</div>
        <div style={{ fontSize: '1.5rem', fontFamily: 'monospace', color: data.value === 0 ? '#ef4444' : '#10b981' }}>
          {data.value}
        </div>
      </div>

      {/* Cola de Bloqueados */}
      <div style={{ flex: '1 1 auto' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Cola de Bloqueados</div>
        <div style={{
          minHeight: '40px',
          border: '2px dashed rgba(255,255,255,0.2)',
          borderRadius: '4px',
          padding: '0.5rem',
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          {data.blockedQueue.length === 0 && (
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Vacía</span>
          )}
          {data.blockedQueue.map((t, idx) => (
            <div key={idx} style={{
              background: t.color,
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              padding: '4px 8px',
              borderRadius: '12px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              P({t.name})
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
