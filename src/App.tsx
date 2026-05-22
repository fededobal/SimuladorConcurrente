import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/layout/Header';
import { CodeEditor } from './components/simulator/CodeEditor';
import { VariableTracker } from './components/simulator/VariableTracker';
import { ThreadScheduler } from './components/simulator/ThreadScheduler';
import { EventLog } from './components/simulator/EventLog';
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
      
      setIsRunning(true);
      if (startPaused) {
        vm.step();
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

  const activeLines = activeState?.threads
    .filter(t => (t as any).activeLine !== undefined)
    .map(t => ({
      line: (t as any).activeLine as number,
      color: t.color
    })) || [];

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
      
      <main className="main-content">
        <CodeEditor 
          code={code} 
          onChange={setCodeWithHistory}
          onUndo={handleUndo}
          onRedo={handleRedo}
          cursorRef={cursorRef}
          pendingCursorRef={pendingCursorRef}
          activeLines={activeLines} 
        />
        <VariableTracker state={activeState} isHistorical={false} />
        <ThreadScheduler threads={activeState?.threads || []} />
        <EventLog logs={logs} />
      </main>
    </div>
  );
}

export default App;