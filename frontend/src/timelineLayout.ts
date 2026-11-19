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
    case 'WAITING': return s.where ? [`wait(${s.where})`, 'wait'] : ['dormido'];
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

// --- columna de nombres ---

/** Ancho de la columna de nombres (procesos y monitores): el menor, el mayor y el de arranque. */
export const NAME_W_MIN = 96;
export const NAME_W_MAX = 480;
export const NAME_W_DEFAULT = 156;
/** Tope del ancho automatico: mas alla, la columna se agranda a mano. */
export const NAME_W_AUTO_MAX = 300;
/** Ancho de instantes que siempre queda a la vista al lado de los nombres, en px. */
const MIN_GRID = 160;

/**
 * El ancho pedido para la columna de nombres llevado a sus limites: ni tan angosta que no
 * se lea nada, ni tan ancha que no queden instantes a la vista.
 *
 * @param available ancho visible de la linea de tiempo, en px (0 si todavia no se midio)
 */
export function clampNameWidth(width: number, available: number): number {
  const room = available > 0 ? available - MIN_GRID : NAME_W_MAX;
  const max = Math.max(NAME_W_MIN, Math.min(NAME_W_MAX, room));
  return Math.round(Math.min(Math.max(width, NAME_W_MIN), max));
}

// --- cartel del instante ---

/** Un punto de la ventana, en px. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Un tamano, en px. */
export interface Size {
  readonly width: number;
  readonly height: number;
}

/** Separacion entre el puntero y el cartel, y entre el cartel y el borde de la ventana. */
const CARD_GAP = 16;
const CARD_MARGIN = 8;

/**
 * Donde va el cartel del instante para acompanar al puntero sin taparlo: abajo y a la
 * derecha; si ahi no entra en la ventana, del otro lado. Nunca queda fuera de la ventana.
 */
export function cardPosition(pointer: Point, card: Size, viewport: Size): { left: number; top: number } {
  const place = (at: number, size: number, limit: number) => {
    const after = at + CARD_GAP;
    const wanted = after + size > limit - CARD_MARGIN ? at - CARD_GAP - size : after;
    return Math.round(Math.max(CARD_MARGIN, Math.min(wanted, limit - CARD_MARGIN - size)));
  };
  return {
    left: place(pointer.x, card.width, viewport.width),
    top: place(pointer.y, card.height, viewport.height),
  };
}
