import React, { useEffect, useRef, useState } from 'react';
import type { LogEntry } from '../../engine/vm';

interface EventLogProps {
  logs: LogEntry[];
}

export const EventLog: React.FC<EventLogProps> = ({ logs }) => {
  const [isOpen, setIsOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  return (
    <div className="glass-panel panel event-log-panel" style={{ flex: isOpen ? 1 : '0 0 auto' }}>
      <div
        className="panel-header"
        style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ fontWeight: 'bold' }}>{isOpen ? '▼' : '▶'} Historial de Eventos</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
          {logs.length} evento{logs.length !== 1 ? 's' : ''}
        </span>
      </div>
      {isOpen && (
        <div
          ref={containerRef}
          className="panel-content event-log-content"
        >
          {logs.length === 0 ? (
            <div className="event-log-empty">
              Esperando simulación...
            </div>
          ) : (
            logs.map((log, idx) => (
              <div key={log.id} className="event-log-entry" style={{ animationDelay: `${Math.min(idx * 0.02, 0.3)}s` }}>
                <span className="event-log-index">{String(idx + 1).padStart(3, ' ')}</span>
                <span className="event-log-separator">│</span>
                {log.threadColor ? (
                  <span className="event-log-thread" style={{ color: log.threadColor }}>
                    [{log.resource}]
                  </span>
                ) : (
                  <span className="event-log-thread event-log-system">
                    [SISTEMA]
                  </span>
                )}
                <span className="event-log-message">{log.message}</span>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
};
