import React, { useMemo, useRef, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import type { LogEntry, Thread } from '../../engine/vm';

interface TimelineProps {
  logs: LogEntry[];
  threads: Thread[];
  onPopOut?: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({ logs, threads, onPopOut }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Group steps by their global index
  const uniqueSteps = useMemo(() => {
    const stepIndices = new Set<number>();
    logs.forEach(l => stepIndices.add(l.stepIndex));
    return Array.from(stepIndices).sort((a, b) => a - b).map(idx => ({ stepIndex: idx }));
  }, [logs]);

  const maxStepIndex = uniqueSteps.length > 0 ? uniqueSteps[uniqueSteps.length - 1].stepIndex : 0;
  // Render steps in chunks to prevent scrollbar jitter every single step
  const totalSteps = Math.max(100, Math.ceil((maxStepIndex + 20) / 50) * 50);
  const visibleSteps = Array.from({ length: totalSteps }, (_, i) => ({ stepIndex: i + 1 }));

  useEffect(() => {
    if (scrollContainerRef.current && maxStepIndex > 0) {
      const container = scrollContainerRef.current;
      const stepPosition = maxStepIndex * 20; // current tip
      const prevStepPosition = (maxStepIndex - 1) * 20; // previous tip
      const containerWidth = container.clientWidth;

      // If the user was looking at the tip of execution (previous step was visible)
      // and the new step is going out of bounds, we follow it.
      // If they scrolled left (prevStepPosition not visible), we don't interrupt them.
      const wasTrackingTip = container.scrollLeft + containerWidth >= prevStepPosition - 20;
      const isNewStepHidden = stepPosition > container.scrollLeft + containerWidth - 20;

      if (wasTrackingTip && isNewStepHidden) {
        container.scrollLeft = stepPosition - containerWidth + 60; // 60px margin
      }
    }
  }, [maxStepIndex]);

  // Threads are no longer reordered, they keep their original order to reflect multiprocessor concurrency.
  const orderedThreads = threads;

  return (
    <div className="glass-panel panel timeline-area" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Timeline de Ejecución</span>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{
              background: 'linear-gradient(45deg, red, yellow, green, blue)',
              display: 'inline-block',
              width: '14px',
              height: '14px',
              borderRadius: '2px'
            }}></span> Ejecutando
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ 
              background: 'rgba(204, 167, 0, 0.8)', 
              display: 'inline-block',
              width: '14px',
              height: '14px',
              borderRadius: '2px'
            }}></span> Bloqueado
          </div>
        </div>
        {onPopOut && (
          <button
            onClick={onPopOut}
            title="Desanclar panel"
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
          >
            <ExternalLink size={16} />
          </button>
        )}
      </div>
      <div
        ref={scrollContainerRef}
        className="panel-content"
        style={{ overflow: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', scrollBehavior: 'smooth' }}
      >
        {threads.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: 'auto' }}>Ejecutá la simulación para ver...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: threads.length > 6 ? '0.35rem' : '0.6rem', minWidth: 'min-content' }}>
            <div style={{ display: 'flex', paddingLeft: '120px', position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg-primary)', paddingBottom: '4px' }}>
              {visibleSteps.map((s, i) => (
                <div key={i} style={{ width: '20px', fontSize: '0.6rem', color: 'var(--text-secondary)', textAlign: 'center', flexShrink: 0 }}>
                  {s.stepIndex % 5 === 0 ? s.stepIndex : <span style={{ opacity: 0.3 }}>·</span>}
                </div>
              ))}
            </div>
            {orderedThreads.map(t => (
              <motion.div
                layout
                initial={false}
                transition={{ type: "spring", stiffness: 400, damping: 40 }}
                key={t.id}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <div style={{ width: '110px', flexShrink: 0, color: t.color, fontWeight: 'bold', fontFamily: 'var(--font-mono)', fontSize: threads.length > 8 ? '0.75rem' : '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '10px' }}>
                  {t.name}
                </div>
                <div style={{ display: 'flex', flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px', padding: '2px', height: '22px', position: 'relative' }}>
                  {(() => {
                    let blocks: any[] = [];
                    let currentState = 'READY'; // Track state across steps
                    let pendingBlocked = false; // READY thread that would block instantly (semaphore already exhausted)

                    visibleSteps.forEach((step, idx) => {
                      if (step.stepIndex > maxStepIndex) {
                        // Future steps
                        if (blocks.length > 0 && blocks[blocks.length - 1].state === 'FUTURE') {
                          blocks[blocks.length - 1].count++;
                          blocks[blocks.length - 1].isLatest = idx === visibleSteps.length - 1;
                        } else {
                          blocks.push({ state: 'FUTURE', count: 1, startIdx: step.stepIndex, isLatest: idx === visibleSteps.length - 1, bg: 'transparent', title: `Futuro (instante ${step.stepIndex})`, opacity: 1 });
                        }
                        return;
                      }

                      const logsForStep = logs.filter(l => l.stepIndex === step.stepIndex);
                      const latestLog = logsForStep[logsForStep.length - 1];

                      if (latestLog) {
                        const snapshotThread = latestLog.snapshot.threads.find(x => x.id === t.id);
                        if (snapshotThread) {
                          currentState = snapshotThread.state;
                          pendingBlocked = !!snapshotThread.pendingBlocked;
                        }
                      }

                      // En multiprocesador, un hilo que no está bloqueado ni terminado, siempre se está ejecutando (aunque tome más ciclos).
                      // Excepción: si su próxima instrucción es P(sem) y sem ya está en 0, va a bloquearse
                      // apenas le toque el turno, así que ya lo mostramos como bloqueado en vez de "ejecutando".
                      let displayState = currentState;
                      if (displayState === 'READY') {
                        displayState = pendingBlocked ? 'BLOCKED' : 'RUNNING';
                      }

                      const isLatest = idx === visibleSteps.length - 1;
                      let bg = 'rgba(133, 133, 133, 0.15)';
                      let title = `Listo (instante ${step.stepIndex})`;
                      let opacity = 1;

                      if (displayState === 'RUNNING') {
                        bg = t.color;
                        opacity = 0.85;
                        title = `Ejecutando (instante ${step.stepIndex})`;
                      } else if (displayState === 'BLOCKED') {
                        bg = 'rgba(204, 167, 0, 0.4)';
                        title = `Bloqueado (instante ${step.stepIndex})`;
                      } else if (displayState === 'TERMINATED') {
                        bg = 'transparent';
                        title = `Terminado`;
                      }

                      if (blocks.length > 0 && blocks[blocks.length - 1].state === displayState) {
                        blocks[blocks.length - 1].count++;
                        blocks[blocks.length - 1].isLatest = isLatest;
                      } else {
                        blocks.push({ state: displayState, count: 1, startIdx: step.stepIndex, isLatest, bg, title, opacity });
                      }
                    });

                    return blocks.map((b) => (
                      <div
                        key={`${b.startIdx}-${b.state}`}
                        title={b.title}
                        style={{
                          position: 'absolute',
                          left: `${(b.startIdx - 1) * 20}px`,
                          width: `${b.count * 20 - 1}px`, // -1px to leave a small gap between blocks
                          height: '18px', // Match track inner height (22px - 4px padding)
                          top: '2px',
                          backgroundColor: b.bg,
                          opacity: b.opacity,
                          borderRadius: '2px',
                          transition: 'width 0.35s cubic-bezier(0.25, 1, 0.5, 1), background-color 0.35s ease',
                          boxShadow: b.isLatest && b.state === 'RUNNING' ? `0 0 10px ${t.color}` : 'none'
                        }}
                      />
                    ));
                  })()}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
