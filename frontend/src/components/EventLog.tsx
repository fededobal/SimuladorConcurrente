import { useEffect, useRef } from 'react';
import type { LogEntry } from '../types';

interface Props {
  entries: LogEntry[];
  viewIndex: number;
  onHover: (index: number | null) => void;
}

export function EventLog({ entries, viewIndex, onHover }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [entries.length]);

  return (
    <div className="panel">
      <div className="panel-header">
        Historial de eventos
        <span className="muted" style={{ textTransform: 'none' }}>{entries.length}</span>
      </div>
      <div className="panel-body" onMouseLeave={() => onHover(null)}>
        <div className="log-list">
          {entries.map((e, i) => (
            <div
              key={e.id}
              className={`log-entry${i === viewIndex ? ' sel' : ''}`}
              onMouseEnter={() => onHover(i)}
            >
              <span className="log-idx">{e.instant}</span>
              <span
                className={`log-kind${e.processColor ? '' : ' log-sys'}`}
                style={e.processColor ? { color: e.processColor } : undefined}
              >
                {e.kind}
              </span>
              <span className="log-msg">{e.message}</span>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>
    </div>
  );
}
