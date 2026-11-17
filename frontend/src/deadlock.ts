// Explicacion de un interbloqueo a partir del snapshot: que espera cada proceso bloqueado y
// que haria falta para que siguiera. No decide nada de la simulacion (eso lo hace el
// nucleo, que es quien informa el interbloqueo): solo pone en palabras el estado final.

import type { ProcessView, Snapshot } from './types';

/** Un proceso que quedo bloqueado en el interbloqueo. */
export interface BlockedProcess {
  readonly id: number;
  readonly name: string;
  readonly color: string;
  readonly line: number;
  /** 'cond': dormido en una variable condicion; 'entry': esperando entrar a un monitor. */
  readonly kind: 'cond' | 'entry';
  /** Monitor de la variable condicion o monitor al que quiere entrar. */
  readonly monitor: string;
  /** Variable condicion en la que duerme (sin el monitor); null si espera entrar. */
  readonly cond: string | null;
  /** Si espera entrar: el proceso que tiene el monitor, o null si no lo tiene nadie. */
  readonly owner: string | null;
  /** Monitores que retiene mientras espera (llamadas cerradas entre monitores). */
  readonly holding: readonly string[];
}

/** El motor nombra una cond como "Monitor.cond" (y "Monitor[2].cond" en un arreglo). */
function splitCond(blockedOn: string): { monitor: string; cond: string } {
  const dot = blockedOn.lastIndexOf('.');
  return dot < 0 ? { monitor: blockedOn, cond: blockedOn }
    : { monitor: blockedOn.slice(0, dot), cond: blockedOn.slice(dot + 1) };
}

function blockedOf(p: ProcessView, snapshot: Snapshot): BlockedProcess | null {
  if (p.state !== 'BLOCKED' || p.blockedOn === null) return null;
  const base = { id: p.id, name: p.name, color: p.color, line: p.line };
  if (p.blockReason === 'COND_WAIT') {
    const { monitor, cond } = splitCond(p.blockedOn);
    // el monitor de la cond lo solto al hacer wait; los demas que tenga, los retiene
    return { ...base, kind: 'cond', monitor, cond, owner: null, holding: p.holding.filter((m) => m !== monitor) };
  }
  if (p.blockReason === 'MONITOR_ENTRY') {
    const owner = snapshot.monitors.find((m) => m.name === p.blockedOn)?.lockOwner?.name ?? null;
    return { ...base, kind: 'entry', monitor: p.blockedOn, cond: null, owner, holding: p.holding };
  }
  return null;
}

/** Los procesos bloqueados del snapshot, en el orden en que se declararon. */
export function blockedProcesses(snapshot: Snapshot): BlockedProcess[] {
  return snapshot.processes
    .map((p) => blockedOf(p, snapshot))
    .filter((b): b is BlockedProcess => b !== null);
}

/** Donde esta parado: "M.c, línea 6" o "entrada de M, línea 11". */
export function placeOf(b: BlockedProcess): string {
  const place = b.kind === 'cond' ? `${b.monitor}.${b.cond}` : `entrada de ${b.monitor}`;
  return b.line > 0 ? `${place}, línea ${b.line}` : place;
}

/** Que lo despertaria y por que no pasa: "signal(c): nadie puede". */
export function wakeOf(b: BlockedProcess): string {
  if (b.kind === 'cond') return `signal(${b.cond}): nadie puede`;
  return b.owner ? `que ${b.owner} salga de ${b.monitor}: está bloqueado` : `que ${b.monitor} quede libre`;
}
