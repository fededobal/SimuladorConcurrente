import React, { useEffect, useState, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import type { VMState, VariableSnapshot, SemaphoreSnapshot, LogEntry } from '../../engine/vm';

// ─── Types ──────────────────────────────────────────────────────────────

interface VariableTrackerProps {
  state: VMState | null;
  isHistorical: boolean;
  onPopOut?: () => void;
  stepIndex?: number;   // current step number from the simulation
  logs?: LogEntry[];     // full log history – hook for future scrubber sync
}

interface ChangeEntry {
  from: unknown;
  to: unknown;
  by: { name: string; color: string } | null;
  step: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────

/** Build a compact history (last N changes) for a variable from logs */
function buildVarHistory(logs: LogEntry[], varName: string, maxEntries = 4): ChangeEntry[] {
  if (!logs || logs.length === 0) return [];

  const changes: ChangeEntry[] = [];
  for (let i = 1; i < logs.length; i++) {
    const prev = logs[i - 1].snapshot.variables[varName];
    const curr = logs[i].snapshot.variables[varName];
    if (!prev || !curr) continue;
    if (JSON.stringify(prev.value) !== JSON.stringify(curr.value)) {
      changes.push({
        from: prev.value,
        to: curr.value,
        by: curr.lastModifiedBy ? { name: curr.lastModifiedBy.name, color: curr.lastModifiedBy.color } : null,
        step: i,
      });
    }
  }
  return changes.slice(-maxEntries).reverse();
}

// ─── Pop-out button (shared) ────────────────────────────────────────────

const PopOutButton = ({ onPopOut }: { onPopOut?: () => void }) => {
  if (!onPopOut) return null;
  return (
    <button
      onClick={onPopOut}
      title="Desanclar panel"
      style={{
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
        color: 'var(--text-primary)',
        padding: '2px 6px',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
    >
      <ExternalLink size={14} />
    </button>
  );
};

// ─── Variable Card (redesigned) ─────────────────────────────────────────

const VariableCard = ({
  name,
  data,
  isHistorical,
  history,
}: {
  name: string;
  data: VariableSnapshot;
  isHistorical: boolean;
  history: ChangeEntry[];
}) => {
  const [flash, setFlash] = useState(false);
  const [flashColor, setFlashColor] = useState<string>('#569cd6');
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

  const modColor = data.lastModifiedBy?.color || 'var(--glass-border)';
  const displayValue = Array.isArray(data.value) ? `[${data.value.join(', ')}]` : String(data.value);
  const valLength = displayValue.length;
  let valFontSize = '1.6rem';
  if (valLength > 15) valFontSize = '1.2rem';
  if (valLength > 30) valFontSize = '1rem';
  if (valLength > 60) valFontSize = '0.8rem';

  const formatHistVal = (v: any) => {
    const s = Array.isArray(v) ? `[${v.join(',')}]` : String(v);
    return s.length > 40 ? s.substring(0, 40) + '...' : s;
  };

  return (
    <div
      className={`state-card${flash ? ' var-flash' : ''}`}
      style={{ '--flash-color': flashColor, borderLeftColor: modColor } as React.CSSProperties}
    >
      {/* Row 1: name + current value */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
          {name}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          fontSize: valFontSize,
          color: 'var(--text-primary)',
          lineHeight: 1.2,
          wordBreak: 'break-all',
          whiteSpace: 'pre-wrap',
          textAlign: 'right',
          flex: '1 1 auto',
          minWidth: '0'
        }}>
          {displayValue}
        </span>
      </div>

      {/* Row 2: secondary context */}
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
        {data.lastModifiedBy ? (
          <span>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: data.lastModifiedBy.color, marginRight: 4, verticalAlign: 'middle' }} />
            modificado por <span style={{ color: data.lastModifiedBy.color, fontWeight: 600 }}>{data.lastModifiedBy.name}</span>
            {data.previousValue !== undefined && JSON.stringify(data.value) !== JSON.stringify(data.previousValue) && (
              <span style={{ opacity: 0.7, wordBreak: 'break-all' }}> · valor anterior: {formatHistVal(data.previousValue)}</span>
            )}
          </span>
        ) : (
          <span style={{ opacity: 0.5 }}>valor inicial</span>
        )}
      </div>

      {/* Row 3: mini history */}
      {history.length > 0 && (
        <div style={{ marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '5px' }}>
          {history.map((h, i) => (
            <div key={i} style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: i > 0 ? '2px' : 0, opacity: 0.7, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: h.by?.color || '#888', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all', flex: '1 1 auto', minWidth: 0 }}>
                {formatHistVal(h.from)} → {formatHistVal(h.to)}
              </span>
              <span style={{ opacity: 0.6, flexShrink: 0 }}>instante {h.step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Semaphore Card (redesigned) ────────────────────────────────────────

const SemaphoreCard = ({
  name,
  data,
  isHistorical,
}: {
  name: string;
  data: SemaphoreSnapshot;
  isHistorical: boolean;
}) => {
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
  const isBinary = data.value <= 1 && data.blockedQueue.length === 0
    ? true
    : data.value <= 1; // heuristic: treat as binary if value is 0 or 1
  const modColor = data.lastModifiedBy?.color || 'var(--glass-border)';

  return (
    <div
      className={`state-card${flash ? ' var-flash' : ''}`}
      style={{ '--flash-color': flashColor, borderLeftColor: modColor } as React.CSSProperties}
    >
      {/* Row 1: name + value + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
          {name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: '1.6rem',
            color: isLocked ? '#f48771' : '#89d185',
            lineHeight: 1,
          }}>
            {data.value}
          </span>
          {isBinary && (
            <span style={{ fontSize: '1rem' }}>{isLocked ? '🔒' : '🔓'}</span>
          )}
        </div>
      </div>

      {/* Row 2: modifier info */}
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
        {data.lastModifiedBy ? (
          <span>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: data.lastModifiedBy.color, marginRight: 4, verticalAlign: 'middle' }} />
            última modificación: <span style={{ color: data.lastModifiedBy.color, fontWeight: 600 }}>{data.lastModifiedBy.name}</span>
          </span>
        ) : (
          <span style={{ opacity: 0.5 }}>valor inicial</span>
        )}
      </div>

      {/* Row 3: FIFO queue */}
      {data.blockedQueue.length > 0 && (
        <div style={{ marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '5px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '3px', fontWeight: 600 }}>
            Esperando ({data.blockedQueue.length}):
          </div>
          <ol style={{ margin: 0, paddingLeft: '1.1rem', listStyleType: 'decimal' }}>
            {data.blockedQueue.map((t, idx) => (
              <li key={`${t.id}-${idx}`} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: idx > 0 ? '1px' : 0 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: t.color, marginRight: 4, verticalAlign: 'middle' }} />
                <span style={{ color: t.color, fontWeight: 600 }}>{t.name}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {data.blockedQueue.length === 0 && isLocked && (
        <div style={{ marginTop: '4px', fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.5 }}>
          Nadie esperando
        </div>
      )}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────

export const VariableTracker: React.FC<VariableTrackerProps> = ({
  state,
  isHistorical,
  onPopOut,
  stepIndex,
  logs,
}) => {
  const currentStep = stepIndex ?? (logs ? logs.length : 0);

  // Empty state
  if (!state) {
    return (
      <div className="glass-panel panel">
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Estado del programa</span>
          <PopOutButton onPopOut={onPopOut} />
        </div>
        <div className="panel-content" style={{ opacity: 0.5 }}>Ejecutá la simulación para ver...</div>
      </div>
    );
  }

  const varEntries = Object.entries(state.variables);
  const semEntries = Object.entries(state.semaphores);

  return (
    <div className="glass-panel panel" style={{ opacity: isHistorical ? 0.7 : 1, transition: 'opacity 0.2s' }}>
      {/* Unified header */}
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span>Estado</span>
          {currentStep > 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
              instante {currentStep}
            </span>
          )}
          {isHistorical && (
            <span style={{ color: '#cca700', fontSize: '0.75rem' }}>(histórico)</span>
          )}
        </div>
        <PopOutButton onPopOut={onPopOut} />
      </div>

      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>
        {/* Variables section */}
        {varEntries.length > 0 && (
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem', fontWeight: 600 }}>
              Variables
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {varEntries.map(([name, data]) => (
                <VariableCard
                  key={name}
                  name={name}
                  data={data}
                  isHistorical={isHistorical}
                  history={buildVarHistory(logs || [], name)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Semaphores section */}
        {semEntries.length > 0 && (
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem', fontWeight: 600 }}>
              Semáforos
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {semEntries.map(([name, data]) => (
                <SemaphoreCard key={name} name={name} data={data} isHistorical={isHistorical} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
