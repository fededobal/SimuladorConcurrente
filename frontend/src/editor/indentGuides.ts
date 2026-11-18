// Guias de sangria del editor: una linea vertical por nivel, como en VS Code. Este modulo solo
// calcula donde van (sin DOM); CodeEditor las dibuja con la medida real de los caracteres.

/** Columnas que ocupa un tab: igual al tab-size del editor (CodeEditor.module.css). */
export const TAB_SIZE = 2;

/** Tramo vertical de una guia: en una columna, del renglon fromLine al toLine (desde 1). */
export interface IndentGuide {
  readonly column: number;
  readonly fromLine: number;
  readonly toLine: number;
}

/** Columnas de sangria de un renglon (un tab llega al proximo multiplo de TAB_SIZE); null si esta en blanco. */
export function indentOf(text: string, tabSize = TAB_SIZE): number | null {
  let column = 0;
  for (const c of text) {
    if (c === ' ') column++;
    else if (c === '\t') column += tabSize - (column % tabSize);
    else return column;
  }
  return null;
}

/**
 * Ancho de un nivel de sangria: la sangria mas chica del programa, y no menos de 2. Sale del
 * codigo y no de una constante porque hay programas con 2 espacios y con 4: con un ancho fijo
 * de 2, el de 4 tendria el doble de lineas.
 */
function unitOf(indents: readonly (number | null)[]): number {
  const positive = indents.filter((i): i is number => i !== null && i > 0);
  return positive.length === 0 ? TAB_SIZE : Math.max(2, Math.min(...positive));
}

/**
 * Sangria con la que se dibuja cada renglon. Uno en blanco toma la menor entre el renglon con
 * texto de arriba y el de abajo: asi la guia sigue a traves de los blancos dentro de un bloque,
 * pero no se estira despues de que el bloque cierra.
 */
function effectiveIndents(indents: readonly (number | null)[]): number[] {
  const next: number[] = new Array(indents.length);
  let below = 0;
  for (let i = indents.length - 1; i >= 0; i--) {
    below = indents[i] ?? below;
    next[i] = below;
  }
  let above = 0;
  return indents.map((indent, i) => {
    if (indent !== null) {
      above = indent;
      return indent;
    }
    return Math.min(above, next[i]);
  });
}

/**
 * Guias de sangria de un programa: en cada renglon, una por nivel que queda a la izquierda de
 * su texto. Los renglones seguidos con la guia en la misma columna forman un solo tramo.
 */
export function indentGuidesOf(lines: readonly string[], tabSize = TAB_SIZE): IndentGuide[] {
  const indents = lines.map((l) => indentOf(l, tabSize));
  const unit = unitOf(indents);
  const effective = effectiveIndents(indents);

  const guides: IndentGuide[] = [];
  // columna -> renglon donde empezo el tramo que sigue abierto
  const open = new Map<number, number>();
  const close = (column: number, lastLine: number) => {
    guides.push({ column, fromLine: open.get(column)!, toLine: lastLine });
    open.delete(column);
  };
  effective.forEach((indent, i) => {
    const line = i + 1;
    for (const column of [...open.keys()]) if (column >= indent) close(column, line - 1);
    for (let column = 0; column < indent; column += unit) if (!open.has(column)) open.set(column, line);
  });
  for (const column of [...open.keys()]) close(column, lines.length);
  return guides.sort((a, b) => a.fromLine - b.fromLine || a.column - b.column);
}

/**
 * Guia del bloque en el que esta el cursor, para destacarla. Si el renglon abre un bloque (el
 * que sigue tiene mas sangria), es la del bloque que abre; si no, la mas interna que lo cruza.
 */
export function activeGuideOf(
  guides: readonly IndentGuide[], lines: readonly string[], line: number, tabSize = TAB_SIZE,
): IndentGuide | null {
  const indent = indentOf(lines[line - 1] ?? '', tabSize);
  if (indent !== null) {
    const opened = guides.find((g) => g.fromLine === line + 1 && g.column === indent);
    if (opened) return opened;
  }
  let inner: IndentGuide | null = null;
  for (const g of guides) {
    if (g.fromLine <= line && line <= g.toLine && (inner === null || g.column > inner.column)) inner = g;
  }
  return inner;
}
