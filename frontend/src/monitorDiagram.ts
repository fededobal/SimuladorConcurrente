import type { LogEntry, MonitorView } from './types';

// Lo que el panel muestra de cada monitor ademas de su estado: que flechas del dibujo se
// recorrieron en el ultimo instante y que eventos de ese instante le corresponden.
//
// El dibujo sigue el de la teoria (Teoria 4, diapositivas 12 a 19): 1 compiten por el acceso,
// 2 esperan en una variable condicion, 3 adentro, ejecutando en el monitor.

/** Flechas del dibujo. "call" entra a la cola de entrada y "return" sale del monitor. */
export type Arrow = 'call' | 'entra' | 'wait' | 'signal' | 'return';

/** true si el evento es de este monitor ("M", "M.cond" o, en un arreglo, "M[1].cond"). */
function isAbout(e: LogEntry, monitor: string): boolean {
  return e.resource === monitor || e.resource.startsWith(monitor + '.');
}

/** Un recorrido: un proceso que paso por una flecha del dibujo en el ultimo instante. */
export interface Travel {
  /** Identifica al recorrido de un instante al otro (el id del evento que lo causo). */
  readonly key: string;
  readonly arrow: Arrow;
  /**
   * Color del proceso que recorre la flecha. Null en "signal": el que la recorre es el
   * proceso despertado, y el evento es del que hizo el signal.
   */
  readonly color: string | null;
}

/** La flecha que recorre un evento de este monitor, o null si no mueve a nadie. */
function arrowOf(e: LogEntry): Arrow | null {
  switch (e.kind) {
    case 'BLOCKED': return 'call';
    case 'ENTER':
    case 'REENTER': return 'entra';
    case 'WAIT': return 'wait';
    case 'SIGNAL': return e.message.includes('despierta') ? 'signal' : null;
    case 'SIGNAL_ALL': return /despierta a 0 /.test(e.message) ? null : 'signal';
    case 'RETURN':
    case 'RELEASE': return 'return';
    default: return null;
  }
}

/** Los recorridos del ultimo paso en este monitor, en el orden en que ocurrieron. */
export function travelsOf(monitor: string, entries: readonly LogEntry[]): Travel[] {
  const out: Travel[] = [];
  for (const e of entries) {
    if (e.processId === null || !isAbout(e, monitor)) continue;
    const arrow = arrowOf(e);
    if (arrow) out.push({ key: e.id, arrow, color: arrow === 'signal' ? null : e.processColor });
  }
  return out;
}

/** Flechas que recorrio algun proceso en el ultimo paso, para resaltarlas. */
export function arrowsOf(monitor: string, entries: readonly LogEntry[]): Set<Arrow> {
  return new Set(travelsOf(monitor, entries).map((t) => t.arrow));
}

/** Eventos que ocurren dentro del monitor y cuyo recurso es una variable, no el monitor. */
const INSIDE_KINDS = new Set(['ASSIGN', 'PUSH', 'POP', 'DELAY', 'DECL', 'WRITE', 'SKIP']);

/**
 * Los eventos del ultimo instante que le corresponden a este monitor: los que lo nombran
 * (entrar, esperar, wait, signal, retornar) y lo que hizo adentro el proceso que lo tiene.
 */
export function eventsAbout(monitor: MonitorView, entries: readonly LogEntry[]): LogEntry[] {
  const owner = monitor.lockOwner?.id ?? null;
  return entries.filter((e) => e.processId !== null && (
    isAbout(e, monitor.name) || (e.processId === owner && INSIDE_KINDS.has(e.kind))
  ));
}
