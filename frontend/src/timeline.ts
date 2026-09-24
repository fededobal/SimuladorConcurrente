import { visibleState, type VisibleState } from './processStates';
import type { Snapshot } from './types';

/** Una columna de la linea de tiempo: el estado de cada proceso al final de un instante. */
export interface TimelineColumn {
  readonly instant: number;
  /** Estado por id de proceso. */
  readonly states: Readonly<Record<number, VisibleState>>;
}

/** Historial que dibuja la linea de tiempo. */
export interface Timeline {
  readonly columns: readonly TimelineColumn[];
  /** Ids de proceso de arriba hacia abajo, segun el ultimo instante. */
  readonly order: readonly number[];
}

/**
 * Tope de instantes que se guardan. Un programa con un ciclo largo puede correr miles de
 * instantes; se conservan los ultimos, que son los que el alumno esta mirando.
 */
const MAX_COLUMNS = 1000;

export const EMPTY_TIMELINE: Timeline = { columns: [], order: [] };

/** Historial recien compilado: sin instantes, procesos en el orden en que se declararon. */
export function startTimeline(s: Snapshot): Timeline {
  return { columns: [], order: s.processes.map((p) => p.id) };
}

/**
 * Agrega el instante del snapshot. Los que avanzaron suben arriba de todo, entre ellos en
 * el orden en que les toco el turno (con la politica al azar, ese orden tambien es al azar:
 * en un mismo instante avanzan en paralelo y ninguno va "primero"). El resto conserva su
 * posicion relativa.
 */
export function appendInstant(t: Timeline, s: Snapshot): Timeline {
  const last = t.columns[t.columns.length - 1];
  // un paso que no avanzo el reloj (la simulacion ya habia terminado) no agrega columna
  if (s.instant === 0 || (last !== undefined && s.instant <= last.instant)) return t;

  const states: Record<number, VisibleState> = {};
  for (const p of s.processes) states[p.id] = visibleState(p, s.monitors);

  const advanced = s.processes
    .filter((p) => p.advanceOrder >= 0)
    .sort((a, b) => a.advanceOrder - b.advanceOrder)
    .map((p) => p.id);
  const top = new Set(advanced);
  const order = [...advanced, ...t.order.filter((id) => !top.has(id))];

  const columns = [...t.columns, { instant: s.instant, states }];
  return { columns: columns.slice(-MAX_COLUMNS), order };
}
