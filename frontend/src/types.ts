// Espejo de los records del nucleo (ar.edu.unlp.info.simulator.vm.Snapshot / LogEntry).

export interface ProcRef {
  id: number;
  name: string;
  color: string;
}

export interface VarView {
  name: string;
  type: string;
  value: string;
  isArray: boolean;
  lastWriterId: number | null;
  /** Elementos de un arreglo o una cola (los primeros 50); null en un escalar. */
  elements: string[] | null;
  /** Cantidad total de elementos; 0 en un escalar. */
  size: number;
}

export interface CondView {
  name: string;
  queue: ProcRef[];
}

export interface MonitorView {
  name: string;
  vars: VarView[];
  conds: CondView[];
  lockOwner: ProcRef | null;
  entryQueue: ProcRef[];
}

export type ProcessState = 'READY' | 'RUNNING' | 'BLOCKED' | 'TERMINATED';

export interface ProcessView {
  id: number;
  name: string;
  color: string;
  state: ProcessState;
  blockReason: 'MONITOR_ENTRY' | 'COND_WAIT' | 'DELAY' | null;
  blockedOn: string | null;
  location: string | null;
  line: number;
  locals: VarView[];
  error: string | null;
  /** true si avanzo en el ultimo instante (se muestra como "ejecutando"). */
  advanced: boolean;
  /** Posicion en el turno del ultimo instante (0 el primero que avanzo), o -1 si no avanzo. */
  advanceOrder: number;
  /** Monitores que tiene tomados (con llamadas cerradas, puede retener uno mientras espera en otro). */
  holding: string[];
  /** Hora (ms, mismo reloj que Date.now()) en que termina su delay, o null si no esta demorado. */
  delayEndsAt: number | null;
}

export interface OutputLine {
  instant: number;
  process: string;
  color: string;
  text: string;
}

export interface Snapshot {
  instant: number;
  processes: ProcessView[];
  monitors: MonitorView[];
  output: OutputLine[];
}

export interface LogEntry {
  id: string;
  instant: number;
  processId: number | null;
  processColor: string | null;
  kind: string;
  resource: string;
  message: string;
}

export interface SimulationCreated {
  id: string;
  seed: number;
  snapshot: Snapshot;
  finished: boolean;
  deadlock: boolean;
}

export interface StepResponse {
  entries: LogEntry[];
  snapshot: Snapshot;
  finished: boolean;
  deadlock: boolean;
  instant: number;
  /** true si nadie puede avanzar pero hay procesos esperando que termine su delay. */
  waiting: boolean;
}

export interface ApiError {
  error: string;
  line: number | null;
}

export type SchedulingPolicy = 'RANDOM' | 'ROUND_ROBIN';
