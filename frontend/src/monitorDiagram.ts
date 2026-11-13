import type { LogEntry, MonitorView, ProcRef } from './types';

/**
 * Las tres zonas del dibujo de la teoria (Teoria 4, diapositivas 12 a 19):
 * 1 espera acceso al monitor, 2 cola por variable condicion, 3 ejecutando en el monitor.
 */
export type Zone = 1 | 2 | 3;

/** Flechas del dibujo. "call" entra a la cola de entrada y "return" sale del monitor. */
export type Arrow = 'call' | 'entra' | 'wait' | 'signal' | 'return';

/** Un proceso dibujado en una zona del monitor. */
export interface Token {
  readonly proc: ProcRef;
  readonly zone: Zone;
  /** En la zona 2, la variable condicion en la que esta dormido. */
  readonly cond: string | null;
}

/** Los procesos de cada zona: el dueno del monitor, la cola de entrada y las colas de cond. */
export function tokensOf(m: MonitorView): Token[] {
  const tokens: Token[] = [];
  if (m.lockOwner) tokens.push({ proc: m.lockOwner, zone: 3, cond: null });
  for (const p of m.entryQueue) tokens.push({ proc: p, zone: 1, cond: null });
  for (const c of m.conds) {
    for (const p of c.queue) tokens.push({ proc: p, zone: 2, cond: c.name });
  }
  return tokens;
}

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

/** Los eventos del ultimo paso que tocan a este monitor, para contarlos debajo del dibujo. */
export function eventsOf(monitor: string, entries: readonly LogEntry[]): LogEntry[] {
  return entries.filter((e) => e.processId !== null && isAbout(e, monitor));
}

/**
 * Nombre corto para el punto de un proceso: inicial e indice en una familia ("Cliente[3]"
 * da "C3"), dos letras si es un proceso suelto ("Productor" da "Pr"). El nombre completo
 * va en el texto emergente y en las listas.
 */
export function shortName(name: string): string {
  const fam = /^(.*)\[(-?\d+)\]$/.exec(name);
  if (fam) return fam[1].charAt(0).toUpperCase() + fam[2];
  return name.charAt(0).toUpperCase() + name.slice(1, 2);
}

/** Cuantos puntos entran en una zona; el resto se cuenta con "+n". */
export const TOKENS_PER_ZONE = 9;

/**
 * Posicion del i-esimo punto dentro de una zona de centro (cx, cy): una grilla de 3 x 3
 * debajo del numero de la zona. La zona 3 tiene a lo sumo un proceso, que va al centro.
 */
export function tokenPosition(zone: Zone, i: number, cx: number, cy: number): [number, number] {
  if (zone === 3) return [cx, cy + 6];
  const col = i % 3;
  const row = Math.floor(i / 3);
  return [cx + (col - 1) * 23, cy - 10 + row * 22];
}
