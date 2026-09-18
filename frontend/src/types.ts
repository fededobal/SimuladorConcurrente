// Espejo de los DTOs del backend (ar.edu.unlp.info.simulador.vm.Snapshot / LogEntry).

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
  blockReason: 'MONITOR_ENTRY' | 'COND_WAIT' | null;
  blockedOn: string | null;
  location: string | null;
  line: number;
  locals: VarView[];
  error: string | null;
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
  snapshot: Snapshot;
}

export interface SimulationCreated {
  id: string;
  seed: number;
  initial: LogEntry;
  finished: boolean;
  deadlock: boolean;
}

export interface StepResponse {
  entries: LogEntry[];
  finished: boolean;
  deadlock: boolean;
  instant: number;
}

export interface ApiError {
  error: string;
  line: number | null;
}

export type SchedulingPolicy = 'RANDOM' | 'ROUND_ROBIN';
