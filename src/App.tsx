import { useState, useEffect, useRef } from 'react';
import { Header } from './components/layout/Header';
import { CodeEditor } from './components/simulator/CodeEditor';
import { VariableTracker } from './components/simulator/VariableTracker';
import { LogViewer } from './components/simulator/LogViewer';
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

function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  
  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(1000);
  
  // VM Data
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentState, setCurrentState] = useState<VMState | null>(null);
  const [hoveredSnapshotId, setHoveredSnapshotId] = useState<string | null>(null);
  
  const vmRef = useRef<VirtualMachine | null>(null);
  const timerRef = useRef<number | null>(null);

  const syncStateToUI = (state: VMState, updatedLogs: LogEntry[]) => {
    setCurrentState(state);
    setLogs(updatedLogs);

    if (vmRef.current?.isFinished()) {
      stopSimulation();
      setLogs(prev => [...prev, {
        id: 'fin',
        type: 'INFO',
        thread: 0,
        resource: '',
        message: 'Simulación Completada',
        time: new Date().toLocaleTimeString(),
        snapshot: state
      }]);
    }
  };

  const startSimulation = () => {
    try {
      setLogs([]);
      setCurrentState(null);
      setHoveredSnapshotId(null);
      setIsPaused(false);
      
      const tokens = tokenize(code);
      const parser = new Parser(tokens);
      const ast = parser.parse();
      
      const vm = new VirtualMachine(ast);
      vm.onStateChange = syncStateToUI;
      vmRef.current = vm;
      
      setIsRunning(true);
    } catch (e: any) {
      setLogs([{
        id: 'err',
        type: 'ERROR',
        thread: 0,
        resource: '',
        message: e.message,
        time: new Date().toLocaleTimeString(),
        snapshot: { variables: {}, semaphores: {}, threads: [] }
      }]);
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

  // Efecto para manejar el Timer de la Simulación Reactivamente
  useEffect(() => {
    if (isRunning && !isPaused) {
      timerRef.current = window.setInterval(() => {
        if (vmRef.current) {
          vmRef.current.step();
        }
      }, speed);
    }

    // Cleanup del timer anterior cuando se pausa, se detiene o cambia la velocidad
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, isPaused, speed]);

  const handleHoverLog = (id: string) => setHoveredSnapshotId(id);
  const handleLeaveLog = () => setHoveredSnapshotId(null);

  const hoveredSnapshot = hoveredSnapshotId 
    ? logs.find(l => l.id === hoveredSnapshotId)?.snapshot || null 
    : null;

  const activeState = hoveredSnapshot || currentState;
  const isHistorical = hoveredSnapshot !== null;

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
        <CodeEditor code={code} onChange={setCode} />
        <VariableTracker state={activeState} isHistorical={isHistorical} />
        <LogViewer logs={logs} onHoverLog={handleHoverLog} onLeaveLog={handleLeaveLog} />
      </main>
    </div>
  );
}

export default App;