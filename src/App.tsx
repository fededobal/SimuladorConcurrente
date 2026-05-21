import { useState, useEffect, useRef } from 'react';
import { Header } from './components/layout/Header';
import { CodeEditor } from './components/simulator/CodeEditor';
import { VariableTracker } from './components/simulator/VariableTracker';
import { ThreadScheduler } from './components/simulator/ThreadScheduler';
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
  
  const vmRef = useRef<VirtualMachine | null>(null);
  const timerRef = useRef<number | null>(null);

  const syncStateToUI = (state: VMState, updatedLogs: LogEntry[]) => {
    setCurrentState(state);
    setLogs(updatedLogs);

    if (vmRef.current?.isFinished()) {
      stopSimulation();
    }
  };

  const startSimulation = (startPaused = false) => {
    try {
      setLogs([]);
      setCurrentState(null);
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

  const activeLines = activeState?.threads.map(t => ({
    line: (t as any).activeLine as number | undefined,
    color: t.color,
    state: t.state
  })).filter((t): t is {line: number, color: string, state: string} => t.line !== undefined) || [];

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
          onChange={setCode} 
          activeLines={activeLines} 
        />
        <VariableTracker state={activeState} isHistorical={false} />
        <ThreadScheduler threads={activeState?.threads || []} />
      </main>
    </div>
  );
}

export default App;