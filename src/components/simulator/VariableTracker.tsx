import React, { useEffect, useState, useRef } from 'react';
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
        Variables {isHistorical && <span style={{color: '#cca700', fontSize: '0.8rem'}}> (Snapshot Histórico)</span>}
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
  const [flashColor, setFlashColor] = useState<string>('#569cd6');
  const [showModal, setShowModal] = useState(false);
  
  const valueStr = JSON.stringify(data.value);
  const prevValueStrRef = useRef(valueStr);

  useEffect(() => {
    if (!isHistorical && prevValueStrRef.current !== valueStr) {
      const color = data.lastModifiedBy?.color || '#569cd6';
      setFlashColor(color);
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 600);
      prevValueStrRef.current = valueStr;
      return () => clearTimeout(timer);
    }
  }, [valueStr, isHistorical, data.lastModifiedBy?.color]);

  return (
    <>
      <div
        className={`var-card-enhanced${flash ? ' var-flash' : ''}`}
        style={{
          '--flash-color': flashColor,
          cursor: 'pointer'
        } as React.CSSProperties}
        onClick={() => setShowModal(true)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--syntax-variable)' }}>{name}</span>
          {data.lastModifiedBy && (
            <span style={{ 
              fontSize: '0.65rem', 
              background: data.lastModifiedBy.color, 
              color: '#fff', 
              padding: '1px 5px', 
              borderRadius: '3px',
              fontWeight: 600,
              letterSpacing: '0.02em',
              flexShrink: 0,
              marginLeft: '0.5rem'
            }}>
              {data.lastModifiedBy.name}
            </span>
          )}
        </div>
        <div style={{ 
          marginTop: '0.5rem', 
          fontFamily: 'var(--font-mono)', 
          fontWeight: 700, 
          color: 'var(--text-primary)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        }}>
          {JSON.stringify(data.value) !== JSON.stringify(data.previousValue) ? (
            <>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textDecoration: 'line-through', opacity: 0.7, flexShrink: 0 }} title="Valor anterior">
                {String(data.previousValue).length > 10 ? String(data.previousValue).substring(0,10)+'...' : String(data.previousValue)}
              </span>
              <span style={{ fontSize: '1rem', color: 'var(--flash-color)', opacity: 0.8, flexShrink: 0 }}>➔</span>
              <span style={{ fontSize: '1.3rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {String(data.value)}
              </span>
            </>
          ) : (
            <span style={{ fontSize: '1.3rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {String(data.value)}
            </span>
          )}
        </div>
      </div>

      {showModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowModal(false)}
        >
          <div 
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              padding: '1.5rem',
              width: '400px',
              maxWidth: '90%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'var(--syntax-variable)', fontFamily: 'var(--font-mono)' }}>Detalle: {name}</h3>
              <button 
                onClick={() => setShowModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
              <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Tipo:</strong>{' '}
                {Array.isArray(data.value) ? `Arreglo (${data.value.length} elementos)` : typeof data.value}
              </div>

              <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Última modificación:</strong>{' '}
                {data.lastModifiedBy ? (
                  <span style={{ 
                    background: data.lastModifiedBy.color, 
                    color: '#fff', 
                    padding: '2px 6px', 
                    borderRadius: '3px',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    marginLeft: '0.5rem'
                  }}>
                    {data.lastModifiedBy.name}
                  </span>
                ) : 'Ninguna'}
              </div>

              <div>
                <strong style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Contenido:</strong>
                <pre style={{
                  background: 'rgba(0,0,0,0.2)',
                  padding: '1rem',
                  borderRadius: '4px',
                  marginTop: '0.5rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}>
                  {Array.isArray(data.value) ? JSON.stringify(data.value, null, 2) : String(data.value)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const SemaphoreCard = ({ name, data, isHistorical }: { name: string, data: SemaphoreSnapshot, isHistorical: boolean }) => {
  const [flash, setFlash] = useState(false);
  const [flashColor, setFlashColor] = useState<string>('#4ec9b0');
  const prevValRef = useRef(data.value);
  const prevQueueLenRef = useRef(data.blockedQueue.length);

  useEffect(() => {
    if (!isHistorical && (prevValRef.current !== data.value || prevQueueLenRef.current !== data.blockedQueue.length)) {
      const color = data.lastModifiedBy?.color || '#4ec9b0';
      setFlashColor(color);
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 600);
      prevValRef.current = data.value;
      prevQueueLenRef.current = data.blockedQueue.length;
      return () => clearTimeout(timer);
    }
  }, [data.value, data.blockedQueue.length, isHistorical]);

  const isLocked = data.value === 0;

  return (
    <div
      className={`sem-card-enhanced${flash ? ' var-flash' : ''}`}
      style={{
        '--flash-color': flashColor,
      } as React.CSSProperties}
    >
      {/* Semaphore header with lock icon */}
      <div style={{ 
        flex: '0 0 auto', 
        borderRight: '1px solid var(--glass-border)', 
        paddingRight: '1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.25rem',
        minWidth: '80px'
      }}>
        <div style={{ fontWeight: 'bold', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--syntax-type)' }}>
          sem {name}
        </div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.4rem',
        }}>
          <span style={{
            fontSize: '1.3rem',
            transition: 'transform 0.3s ease',
            display: 'inline-block',
            transform: isLocked ? 'scale(1.1)' : 'scale(1)',
          }}>
            {isLocked ? '🔒' : '🔓'}
          </span>
          <span style={{ 
            fontSize: '1.5rem', 
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: isLocked ? '#f48771' : '#89d185',
            transition: 'color 0.3s ease',
          }}>
            {data.value}
          </span>
        </div>
      </div>

      {/* Blocked queue */}
      <div style={{ flex: '1 1 auto' }}>
        <div style={{ 
          fontSize: '0.75rem', 
          color: 'var(--text-secondary)', 
          marginBottom: '0.4rem',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.03em'
        }}>
          Cola de Bloqueados
        </div>
        <div className="blocked-queue-container">
          {data.blockedQueue.length === 0 && (
            <span className="blocked-queue-empty">Vacía</span>
          )}
          {data.blockedQueue.map((t, idx) => (
            <div
              key={`${t.id}-${idx}`}
              className="blocked-queue-badge"
              style={{
                '--badge-color': t.color,
              } as React.CSSProperties}
            >
              <span className="blocked-queue-badge-dot" style={{ backgroundColor: t.color }} />
              <span className="blocked-queue-badge-name">{t.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
