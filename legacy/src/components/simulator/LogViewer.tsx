import React, { useEffect, useRef } from 'react';
import type { LogEntry } from '../../engine/vm';

interface LogViewerProps {
  logs: LogEntry[];
  onHoverLog: (id: string) => void;
  onLeaveLog: () => void;
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs, onHoverLog, onLeaveLog }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="glass-panel panel">
      <div className="panel-header">Log de la simulación</div>
      <div className="panel-content" onMouseLeave={onLeaveLog}>
        {logs.map((log) => (
          <div 
            key={log.id} 
            className="log-entry" 
            onMouseEnter={() => onHoverLog(log.id)}
            style={{ 
              cursor: 'pointer', 
              transition: 'background 0.2s', 
              borderLeft: log.threadColor ? `4px solid ${log.threadColor}` : '4px solid transparent',
              paddingLeft: '0.5rem',
              marginBottom: '4px'
            }}
          >
            <span className="log-time">[{log.time}]</span>
            {log.thread > 0 && (
              <span className="log-thread" style={{ color: log.threadColor, fontWeight: 'bold' }}>
                Hilo {log.thread}: 
              </span>
            )}
            <span style={{ marginLeft: '4px' }}>{log.message}</span>
            {log.resource && <span className="log-resource"> ({log.resource})</span>}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};
