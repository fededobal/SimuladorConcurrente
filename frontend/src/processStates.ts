import type { ProcessView } from './types';

/**
 * Estado de un proceso tal como lo ve el alumno. El editor y la linea de tiempo lo pintan
 * con el mismo color (clases `st-*` de index.css), asi el renglon donde esta parado un
 * proceso y su celda del instante actual siempre coinciden. Ejecutando, el proceso se pinta
 * con su propio color; en la linea de tiempo, los instantes dentro de un monitor llevan
 * ademas una "M".
 */
export type VisibleState =
  | 'RUNNING_PROCESS' | 'RUNNING_MONITOR' | 'COMPETING' | 'WAITING' | 'DELAYED' | 'READY'
  | 'TERMINATED';

/** Nombre corto del estado (leyenda). */
export const STATE_LABEL: Record<VisibleState, string> = {
  RUNNING_PROCESS: 'ejecutando en el proceso',
  RUNNING_MONITOR: 'ejecutando en el monitor',
  COMPETING: 'compitiendo',
  WAITING: 'esperando',
  DELAYED: 'en delay',
  READY: 'sin turno',
  TERMINATED: 'terminado',
};

/** Que significa cada estado, para el texto emergente. */
export const STATE_HINT: Record<VisibleState, string> = {
  RUNNING_PROCESS: 'ejecutando su propio código (fuera de los monitores)',
  RUNNING_MONITOR: 'ejecutando dentro de un monitor, con el monitor tomado',
  COMPETING: 'compitiendo por entrar al monitor',
  WAITING: 'esperando, dormido en una variable condición',
  DELAYED: 'demorado por un delay hasta que pasen los instantes indicados; si está en un monitor, lo sigue teniendo tomado',
  READY: 'sin turno: podía avanzar, pero no le tocó en este instante',
  TERMINATED: 'terminado',
};

/** Clase de index.css que da el color (y el rayado) de cada estado. */
export const STATE_CLASS: Record<VisibleState, string> = {
  RUNNING_PROCESS: 'st-running-process',
  RUNNING_MONITOR: 'st-running-monitor',
  COMPETING: 'st-competing',
  WAITING: 'st-waiting',
  DELAYED: 'st-delayed',
  READY: 'st-ready',
  TERMINATED: 'st-terminated',
};

/**
 * Clasifica un proceso del snapshot. Manda el estado al final del instante: el que avanzo
 * y en ese mismo instante quedo bloqueado (hizo wait, o encontro el monitor tomado) se
 * muestra bloqueado, que es donde esta parado ahora.
 */
export function visibleState(p: ProcessView): VisibleState {
  if (p.state === 'TERMINATED') return 'TERMINATED';
  if (p.state === 'BLOCKED') {
    if (p.blockReason === 'DELAY') return 'DELAYED';
    return p.blockReason === 'COND_WAIT' ? 'WAITING' : 'COMPETING';
  }
  // el motor devuelve READY a los que avanzaron: se muestran como "ejecutando"
  if (!p.advanced && p.state !== 'RUNNING') return 'READY';
  // Dentro del monitor es tener algun lock. Con las llamadas cerradas (ADR 0007), el que
  // llama a otro monitor conserva el anterior, asi que puede tener varios.
  return p.holding.length > 0 ? 'RUNNING_MONITOR' : 'RUNNING_PROCESS';
}

/**
 * Donde esta parado el proceso: la variable condicion en la que duerme, el monitor por el
 * que compite o el que tiene tomado; null en los demas estados. El motor nombra la cond como
 * "Monitor.cond"; aca queda solo "cond", que es como la escribio el alumno.
 */
export function whereOf(p: ProcessView, state: VisibleState): string | null {
  switch (state) {
    case 'WAITING': {
      const on = p.blockedOn ?? '';
      return on.slice(on.indexOf('.') + 1) || null;
    }
    case 'COMPETING': return p.blockedOn;
    case 'RUNNING_MONITOR': return p.holding[p.holding.length - 1] ?? null;
    default: return null;
  }
}

/**
 * Lo que esta haciendo un proceso (o varios en el mismo estado y lugar), en pocas palabras:
 * "en Buffer", "compite por Buffer", "dormido en wait(libre)". Vacio si ejecuta su propio
 * codigo, que no necesita aclaracion.
 */
export function stateDetail(state: VisibleState, where: string | null, plural = false): string {
  switch (state) {
    case 'RUNNING_MONITOR': return where ? `en ${where}` : 'en el monitor';
    case 'COMPETING': return `${plural ? 'compiten' : 'compite'} por ${where ?? 'el monitor'}`;
    case 'WAITING': return `${plural ? 'dormidos' : 'dormido'} en wait(${where ?? ''})`;
    case 'DELAYED': return 'en delay';
    case 'READY': return 'sin turno';
    case 'TERMINATED': return plural ? 'terminados' : 'terminado';
    case 'RUNNING_PROCESS': return '';
  }
}

/** Cuanto le falta a un delay, en palabras: "faltan 3 instantes", "sigue en el próximo". */
export function delayLeft(remaining: number): string {
  if (remaining <= 0) return 'sigue en el próximo';
  return remaining === 1 ? 'falta 1 instante' : `faltan ${remaining} instantes`;
}
