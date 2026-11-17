// Calculos de la linea de tiempo que no dependen del DOM: como se parten las columnas en
// tramos, que rotulo lleva cada uno y que filas hay que dibujar segun el desplazamiento.

import type { VisibleState } from './processStates';
import type { TimelineColumn } from './timeline';

/** Alto de una fila (carril de monitor o proceso), en px. */
export const ROW_H = 28;
/** Alto de la regla de instantes, en px. */
export const RULER_H = 26;
/** Aire debajo de la ultima fila, para que no quede pegada al borde. */
export const BOTTOM_PAD = 12;
/** Alto del encabezado del panel (titulo y leyenda) con su borde, en px. */
const HEAD_H = 35;

/**
 * Alto que necesita la linea de tiempo para mostrar todas sus filas sin desplazarse. Lo usa
 * la pantalla para darle al panel el alto justo (hasta el tope que fije el CSS).
 */
export function timelineHeight(rows: number): number {
  return HEAD_H + RULER_H + Math.max(rows, 2) * ROW_H + BOTTOM_PAD + 2;
}

/** Tramo de instantes seguidos en el mismo estado y lugar: se dibuja como una sola barra. */
export interface Segment {
  readonly state: VisibleState;
  readonly where: string | null;
  /** Indice de la primera columna del tramo. */
  readonly from: number;
  readonly length: number;
}

/** Los tramos de un proceso; un proceso terminado no tiene barra. */
export function segmentsOf(id: number, columns: readonly TimelineColumn[]): Segment[] {
  const out: { state: VisibleState; where: string | null; from: number; length: number }[] = [];
  columns.forEach((col, i) => {
    const state = col.states[id];
    if (state === undefined || state === 'TERMINATED') return;
    const where = col.where[id] ?? null;
    const prev = out[out.length - 1];
    if (prev && prev.state === state && prev.where === where && prev.from + prev.length === i) {
      prev.length++;
    } else {
      out.push({ state, where, from: i, length: 1 });
    }
  });
  return out;
}

/** Tramo del carril de un monitor: quien lo tuvo (null: libre). */
export interface OwnerSegment {
  readonly owner: number | null;
  readonly from: number;
  readonly length: number;
}

/** Los tramos del carril de un monitor: un tramo por cada cambio de dueno. */
export function ownerSegmentsOf(name: string, columns: readonly TimelineColumn[]): OwnerSegment[] {
  const out: { owner: number | null; from: number; length: number }[] = [];
  columns.forEach((col, i) => {
    const owner = col.owners[name] ?? null;
    const prev = out[out.length - 1];
    if (prev && prev.owner === owner) prev.length++;
    else out.push({ owner, from: i, length: 1 });
  });
  return out;
}

/**
 * Rotulos de un tramo, del mas largo al mas corto: se usa el primero que entre. Dicen lo
 * mismo que la leyenda, con el lugar cuando se conoce ("en Buffer", "wait(libre)").
 */
export function labelsOf(s: Segment): string[] {
  switch (s.state) {
    case 'RUNNING_MONITOR': return s.where ? [`en ${s.where}`, s.where] : ['en el monitor'];
    case 'RUNNING_PROCESS': return ['en el proceso'];
    case 'COMPETING': return s.where ? [`compite por ${s.where}`, 'compite'] : ['compite'];
    case 'WAITING': return s.where ? [`wait(${s.where})`, 'wait'] : ['en wait'];
    case 'DELAYED': return ['en delay', 'delay'];
    default: return [];
  }
}

/** Filas a dibujar: las que se ven y unas pocas mas, para que al desplazar no haya huecos. */
export interface RowRange {
  /** Indice de la primera fila a dibujar. */
  readonly first: number;
  /** Indice siguiente al de la ultima. */
  readonly end: number;
}

/**
 * Rango de filas visibles de una lista de filas de igual alto.
 *
 * @param scrollTop cuanto se desplazo la lista, en px
 * @param viewHeight alto visible, en px (0 si todavia no se midio: se dibujan todas hasta el tope)
 * @param overscan filas de mas a cada lado
 */
export function visibleRows(
  scrollTop: number, viewHeight: number, rowHeight: number, total: number, overscan = 6,
): RowRange {
  if (total === 0) return { first: 0, end: 0 };
  const first = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visible = viewHeight > 0 ? Math.ceil(viewHeight / rowHeight) : 40;
  const end = Math.min(total, Math.floor(scrollTop / rowHeight) + visible + overscan);
  return { first: Math.min(first, Math.max(0, total - 1)), end: Math.max(end, Math.min(total, first + 1)) };
}
