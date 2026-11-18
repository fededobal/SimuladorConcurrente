import { TAB_SIZE } from './indentGuides';

/** Lugar del cursor en el codigo: renglon (desde 1) y columna en pantalla (desde 0, con los tabs expandidos). */
export interface CaretPlace {
  readonly line: number;
  readonly column: number;
}

/**
 * Donde dibujar el cursor propio del editor, o null si hay texto seleccionado (ahi no se
 * dibuja cursor). El editor oculta el del navegador porque Safari, con un interlineado amplio,
 * lo dibuja unos pixeles mas arriba que el renglon y se sale del recuadro.
 */
export function caretPlaceOf(
  text: string, selectionStart: number, selectionEnd: number, tabSize = TAB_SIZE,
): CaretPlace | null {
  if (selectionStart !== selectionEnd) return null;
  const before = text.slice(0, selectionStart);
  const lineStart = before.lastIndexOf('\n') + 1;
  let column = 0;
  for (const c of before.slice(lineStart)) column += c === '\t' ? tabSize - (column % tabSize) : 1;
  return { line: before.split('\n').length, column };
}
