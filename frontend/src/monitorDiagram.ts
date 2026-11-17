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

/** Flechas que recorrio algun proceso en el ultimo paso, para resaltarlas. */
export function arrowsOf(monitor: string, entries: readonly LogEntry[]): Set<Arrow> {
  const out = new Set<Arrow>();
  for (const e of entries) {
    if (e.processId === null || !isAbout(e, monitor)) continue;
    switch (e.kind) {
      case 'BLOCKED': out.add('call'); break;
      case 'ENTER':
      case 'REENTER': out.add('entra'); break;
      case 'WAIT': out.add('wait'); break;
      case 'SIGNAL':
        if (e.message.includes('despierta')) out.add('signal');
        break;
      case 'SIGNAL_ALL':
        if (!/despierta a 0 /.test(e.message)) out.add('signal');
        break;
      case 'RETURN':
      case 'RELEASE': out.add('return'); break;
      default: break;
    }
  }
  return out;
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
