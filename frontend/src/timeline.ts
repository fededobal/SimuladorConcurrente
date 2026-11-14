import { visibleState, type VisibleState } from './processStates';
import type { LogEntry, ProcessView, Snapshot } from './types';

/** Una columna de la linea de tiempo: el estado de cada proceso al final de un instante. */
export interface TimelineColumn {
  readonly instant: number;
  /** Estado por id de proceso. */
  readonly states: Readonly<Record<number, VisibleState>>;
  /**
   * Donde esta cada proceso, por id: la variable condicion en la que espera, el monitor por
   * el que compite o el monitor que tiene tomado; null si no esta en ninguno de esos casos.
   */
  readonly where: Readonly<Record<number, string | null>>;
  /** Dueno de cada monitor (id de proceso), o null si esta libre. */
  readonly owners: Readonly<Record<string, number | null>>;
  /** Eventos del paso que produjo este instante, para contarlo en palabras. */
  readonly events: readonly LogEntry[];
}

/** Historial que dibuja la linea de tiempo. */
export interface Timeline {
  readonly columns: readonly TimelineColumn[];
  /** Ids de proceso de arriba hacia abajo: el orden en que se declararon. */
  readonly order: readonly number[];
  /** Nombres de los monitores, en el orden en que se declararon. */
  readonly monitors: readonly string[];
}

/**
 * Tope de instantes que se guardan. Un programa con un ciclo largo puede correr miles de
 * instantes; se conservan los ultimos, que son los que el alumno esta mirando.
 */
const MAX_COLUMNS = 1000;

export const EMPTY_TIMELINE: Timeline = { columns: [], order: [], monitors: [] };

/** Historial recien compilado: sin instantes, procesos y monitores en el orden declarado. */
export function startTimeline(s: Snapshot): Timeline {
  return {
    columns: [],
    order: s.processes.map((p) => p.id),
    monitors: s.monitors.map((m) => m.name),
  };
}

/** Familia de un proceso: "Cliente" para "Cliente[3]"; el nombre entero si es uno suelto. */
export function familyOf(name: string): string {
  return name.replace(/\[.*$/, '');
}

/**
 * Donde esta parado el proceso, para rotular su tramo. El motor nombra la cond como
 * "Monitor.cond"; aca queda solo "cond", que es como la escribio el alumno.
 */
function whereOf(p: ProcessView, state: VisibleState): string | null {
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
 * Agrega el instante del snapshot con los eventos del paso. El orden de las filas no
 * cambia: con filas fijas se puede seguir a un proceso de punta a punta.
 */
export function appendInstant(t: Timeline, s: Snapshot, events: readonly LogEntry[]): Timeline {
  const last = t.columns[t.columns.length - 1];
  // un paso que no avanzo el reloj (la simulacion ya habia terminado) no agrega columna
  if (s.instant === 0 || (last !== undefined && s.instant <= last.instant)) return t;

  const states: Record<number, VisibleState> = {};
  const where: Record<number, string | null> = {};
  for (const p of s.processes) {
    states[p.id] = visibleState(p);
    where[p.id] = whereOf(p, states[p.id]);
  }
  const owners: Record<string, number | null> = {};
  for (const m of s.monitors) owners[m.name] = m.lockOwner?.id ?? null;

  const columns = [...t.columns, { instant: s.instant, states, where, owners, events }];
  return { ...t, columns: columns.slice(-MAX_COLUMNS) };
}
