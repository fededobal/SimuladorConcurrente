import type { MonitorView, ProcessView } from './types';

/**
 * Estado de un proceso tal como lo ve el alumno. El editor y la linea de tiempo lo pintan
 * con el mismo color (clases `st-*` de index.css), asi el renglon donde esta parado un
 * proceso y su celda del instante actual siempre coinciden. Ejecutando, el proceso se pinta
 * con su propio color; en la linea de tiempo, los instantes dentro de un monitor llevan
 * ademas una "M".
 */
export type VisibleState =
  | 'RUNNING_PROCESS' | 'RUNNING_MONITOR' | 'COMPETING' | 'WAITING' | 'READY' | 'TERMINATED';

/** Nombre corto del estado (leyenda). */
export const STATE_LABEL: Record<VisibleState, string> = {
  RUNNING_PROCESS: 'ejecutando en el proceso',
  RUNNING_MONITOR: 'ejecutando en el monitor',
  COMPETING: 'compitiendo',
  WAITING: 'esperando',
  READY: 'sin turno',
  TERMINATED: 'terminado',
};

/** Que significa cada estado, para el texto emergente. */
export const STATE_HINT: Record<VisibleState, string> = {
  RUNNING_PROCESS: 'ejecutando su propio código (fuera de los monitores)',
  RUNNING_MONITOR: 'ejecutando dentro de un monitor, con el monitor tomado',
  COMPETING: 'compitiendo por entrar al monitor',
  WAITING: 'esperando, dormido en una variable condición',
  READY: 'sin turno: podía avanzar, pero no le tocó en este instante',
  TERMINATED: 'terminado',
};

/** Clase de index.css que da el color (y el rayado) de cada estado. */
export const STATE_CLASS: Record<VisibleState, string> = {
  RUNNING_PROCESS: 'st-running-process',
  RUNNING_MONITOR: 'st-running-monitor',
  COMPETING: 'st-competing',
  WAITING: 'st-waiting',
  READY: 'st-ready',
  TERMINATED: 'st-terminated',
};

/**
 * Clasifica un proceso del snapshot. Manda el estado al final del instante: el que avanzo
 * y en ese mismo instante quedo bloqueado (hizo wait, o encontro el monitor tomado) se
 * muestra bloqueado, que es donde esta parado ahora.
 */
export function visibleState(p: ProcessView, monitors: readonly MonitorView[]): VisibleState {
  if (p.state === 'TERMINATED') return 'TERMINATED';
  if (p.state === 'BLOCKED') return p.blockReason === 'COND_WAIT' ? 'WAITING' : 'COMPETING';
  // el motor devuelve READY a los que avanzaron: se muestran como "ejecutando"
  if (!p.advanced && p.state !== 'RUNNING') return 'READY';
  // Dentro del monitor es tener su lock. Con las llamadas abiertas (ADR 0004), el que
  // llama a otro monitor suelta el anterior, asi que tiene a lo sumo uno.
  return monitors.some((m) => m.lockOwner?.id === p.id) ? 'RUNNING_MONITOR' : 'RUNNING_PROCESS';
}
