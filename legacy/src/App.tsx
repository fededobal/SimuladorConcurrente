import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/layout/Header';
import { FloatingWindow } from './components/layout/FloatingWindow';
import { CodeEditor } from './components/simulator/CodeEditor';
import { VariableTracker } from './components/simulator/VariableTracker';
import { Timeline } from './components/simulator/Timeline';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { tokenize } from './engine/lexer';
import { Parser } from './engine/parser';
import { VirtualMachine } from './engine/vm';
import type { VMState, LogEntry } from './engine/vm';
import './index.css';

const DEFAULT_CODE = `int contador = 0;
sem mutex = 1;

process Productor {
  P(mutex);
  contador = contador + 1;
  V(mutex);
}

process Consumidor {
  P(mutex);
  contador = contador - 1;
  V(mutex);
}
`;

type HistoryEntry = { code: string; cursorStart: number; cursorEnd: number };

function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const undoStack = useRef<HistoryEntry[]>([]);
  const redoStack = useRef<HistoryEntry[]>([]);
  const cursorRef = useRef({ start: 0, end: 0 });
  const pendingCursorRef = useRef<{ start: number; end: number } | null>(null);
  const MAX_HISTORY = 200;

  const setCodeWithHistory = useCallback((newCode: string) => {
    undoStack.current.push({ code, cursorStart: cursorRef.current.start, cursorEnd: cursorRef.current.end });
    if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift();
    redoStack.current = [];
    setCode(newCode);
  }, [code]);

  const handleUndo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const entry = undoStack.current.pop()!;
    redoStack.current.push({ code, cursorStart: cursorRef.current.start, cursorEnd: cursorRef.current.end });
    setCode(entry.code);
    pendingCursorRef.current = { start: entry.cursorStart, end: entry.cursorEnd };
  }, [code]);

  const handleRedo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const entry = redoStack.current.pop()!;
    undoStack.current.push({ code, cursorStart: cursorRef.current.start, cursorEnd: cursorRef.current.end });
    setCode(entry.code);
    pendingCursorRef.current = { start: entry.cursorStart, end: entry.cursorEnd };
  }, [code]);

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(1000);

  const [currentState, setCurrentState] = useState<VMState | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const vmRef = useRef<VirtualMachine | null>(null);
  const timerRef = useRef<number | null>(null);

  // Floating windows state
  const [floatedPanels, setFloatedPanels] = useState<Record<string, boolean>>({
    code: false,
    vars: false,
    timeline: false
  });

  const [focusedWindow, setFocusedWindow] = useState<string | null>(null);

  const toggleFloat = (panel: string) => {
    setFloatedPanels(prev => ({ ...prev, [panel]: !prev[panel] }));
    if (!floatedPanels[panel]) setFocusedWindow(panel);
  };

  const getZIndex = (panel: string) => panel === focusedWindow ? 100 : 90;

  const syncStateToUI = (state: VMState, newLogs: LogEntry[]) => {
    setCurrentState(state);
    setLogs(newLogs);

    if (vmRef.current?.isFinished()) {
      stopSimulation();
    }
  };

  const startSimulation = (startPaused = false) => {
    try {
      setCurrentState(null);
      setLogs([]);
      setIsPaused(startPaused);

      const tokens = tokenize(code);
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const vm = new VirtualMachine(ast);
      vm.onStateChange = syncStateToUI;
      vmRef.current = vm;
      vm.emitState(); // Push initial state to UI

      setIsRunning(true);
      if (startPaused) {
        setIsPaused(true);
      } else {
        setIsPaused(false);
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message);
    }
  };

  const stopSimulation = () => {
    setIsRunning(false);
    setIsPaused(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  const stepSimulation = () => {
    if (vmRef.current && isPaused) {
      vmRef.current.step();
    }
  };

  useEffect(() => {
    if (isRunning && !isPaused) {
      timerRef.current = window.setInterval(() => {
        if (vmRef.current) {
          vmRef.current.step();
        }
      }, speed);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, isPaused, speed]);

  const activeState = currentState;

  const activeLines = (isRunning || isPaused) ? (activeState?.threads
    .filter(t => (t as any).activeLine !== undefined)
    .map(t => {
      // Determinar si está bloqueado y por qué recurso (semáforo)
      let blockedResource = '';
      if (t.state === 'BLOCKED' && activeState) {
        // Buscar en las colas de semáforos
        for (const [semName, sem] of Object.entries(activeState.semaphores)) {
          if (sem.blockedQueue.some(b => b.id === t.id)) {
            blockedResource = semName;
            break;
          }
        }
      }
      // Si está READY pero su próxima instrucción va a bloquearse apenas le toque el turno
      // (semáforo ya en 0), lo mostramos como bloqueado para no sugerir que sigue "corriendo".
      const effectiveState = t.state === 'READY' && (t as any).pendingBlocked ? 'BLOCKED' : t.state;

      return {
        line: (t as any).activeLine as number,
        color: t.color,
        state: effectiveState,
        name: t.name,
        blockedResource
      };
    }) || []) : [];

  const renderCodeEditor = (isFloating = false) => (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <CodeEditor
        code={code}
        onChange={setCodeWithHistory}
        onUndo={handleUndo}
        onRedo={handleRedo}
        cursorRef={cursorRef}
        pendingCursorRef={pendingCursorRef}
        activeLines={activeLines}
        onPopOut={!isFloating ? () => toggleFloat('code') : undefined}
      />
    </div>
  );

  const renderVars = (isFloating = false) => (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <VariableTracker
        state={activeState}
        isHistorical={false}
        onPopOut={!isFloating ? () => toggleFloat('vars') : undefined}
        logs={logs}
        stepIndex={logs.length > 0 ? logs.length - 1 : 0}
      />
    </div>
  );

  const renderTimeline = (isFloating = false) => (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Timeline
        logs={logs}
        threads={activeState?.threads || []}
        onPopOut={!isFloating ? () => toggleFloat('timeline') : undefined}
      />
    </div>
  );

  return (
    <div className="app-container">
      <Header
        onStart={startSimulation}
        onStop={stopSimulation}
        onPauseResume={togglePause}
        onStep={stepSimulation}
        speed={speed}
        onSpeedChange={setSpeed}
        isRunning={isRunning}
        isPaused={isPaused}
      />

      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

        <Group orientation="vertical" style={{ flex: 1 }}>

          <Panel defaultSize={75} minSize={20}>
            <Group orientation="horizontal">

              {!floatedPanels.code && (
                <Panel defaultSize={60} minSize={20}>
                  {renderCodeEditor()}
                </Panel>
              )}

              {!floatedPanels.code && !floatedPanels.vars && (
                <Separator className="resize-handle-v" />
              )}

              {!floatedPanels.vars && (
                <Panel defaultSize={40} minSize={20}>
                  {renderVars()}
                </Panel>
              )}

            </Group>
          </Panel>

          {!floatedPanels.timeline && (!floatedPanels.code || !floatedPanels.vars) && (
            <Separator className="resize-handle-h" />
          )}

          {!floatedPanels.timeline && (
            <Panel defaultSize={25} minSize={10}>
              {renderTimeline()}
            </Panel>
          )}

        </Group>

      </main>

      {floatedPanels.code && (
        <FloatingWindow
          title="Código Fuente"
          onClose={() => toggleFloat('code')}
          defaultWidth={600}
          defaultHeight={500}
          zIndex={getZIndex('code')}
          onFocus={() => setFocusedWindow('code')}
        >
          {renderCodeEditor(true)}
        </FloatingWindow>
      )}

      {floatedPanels.vars && (
        <FloatingWindow
          title="Variables y Semáforos"
          onClose={() => toggleFloat('vars')}
          defaultWidth={450}
          defaultHeight={600}
          zIndex={getZIndex('vars')}
          onFocus={() => setFocusedWindow('vars')}
        >
          {renderVars(true)}
        </FloatingWindow>
      )}

      {floatedPanels.timeline && (
        <FloatingWindow
          title="Timeline de Ejecución"
          onClose={() => toggleFloat('timeline')}
          defaultWidth={800}
          defaultHeight={300}
          zIndex={getZIndex('timeline')}
          onFocus={() => setFocusedWindow('timeline')}
        >
          {renderTimeline(true)}
        </FloatingWindow>
      )}

    </div>
  );
}

export default App;