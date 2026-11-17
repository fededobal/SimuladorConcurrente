// Ayudas de edicion del editor de codigo: sangria, pares, comentarios. Todas escriben a
// traves de `replaceRange`, que conserva el deshacer nativo del textarea.

/** Sangria de un nivel. El lenguaje no usa tabs. */
const TAB = '  ';

type TA = HTMLTextAreaElement;

const PAIRS: Record<string, string> = { '{': '}', '(': ')', '[': ']', '"': '"' };
const CLOSERS = new Set(['}', ')', ']', '"']);

const lineStart = (v: string, i: number) => v.lastIndexOf('\n', i - 1) + 1;

function lineEnd(v: string, i: number) {
  const j = v.indexOf('\n', i);
  return j < 0 ? v.length : j;
}

const indentOf = (l: string) => l.slice(0, l.length - l.trimStart().length);

/**
 * Reemplaza [desde, hasta) por `texto` a traves de execCommand para no romper el
 * undo/redo nativo del textarea: escribir en `value` a mano vacia la pila de deshacer
 * del navegador. El `input` que dispara execCommand es el que ve React.
 */
function replaceRange(ta: TA, desde: number, hasta: number, texto: string, selA?: number, selB?: number) {
  ta.focus();
  ta.setSelectionRange(desde, hasta);
  if (!document.execCommand('insertText', false, texto)) {
    const v = ta.value;
    ta.value = v.slice(0, desde) + texto + v.slice(hasta);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
  const a = selA ?? desde + texto.length;
  ta.setSelectionRange(a, selB ?? a);
}

/** Tab / Shift+Tab sobre las lineas que toca la seleccion. */
function indent(ta: TA, quitar: boolean) {
  const { value: v, selectionStart: s, selectionEnd: t } = ta;

  // Sin seleccion, Tab sangra donde esta el cursor, aunque el renglon este vacio: si no,
  // no habria forma de indent una linea en blanco antes de escribirla.
  if (!quitar && s === t) {
    replaceRange(ta, s, t, TAB);
    return;
  }

  const desde = lineStart(v, s);
  const hasta = lineEnd(v, t);

  let dPrimera = 0;
  let dTotal = 0;
  const lineas = v.slice(desde, hasta).split('\n').map((l, i) => {
    let res = l;
    let d = 0;
    if (quitar) {
      const m = /^ {1,2}/.exec(l);
      if (m) { res = l.slice(m[0].length); d = -m[0].length; }
    } else if (l.trim() !== '') {
      res = TAB + l;
      d = TAB.length;
    }
    if (i === 0) dPrimera = d;
    dTotal += d;
    return res;
  });

  const texto = lineas.join('\n');
  replaceRange(ta, desde, hasta, texto, Math.max(desde, s + dPrimera), Math.max(desde, t + dTotal));
}

/** Enter manteniendo la sangria, un nivel mas despues de '{'. */
function newLine(ta: TA) {
  const { value: v, selectionStart: s, selectionEnd: t } = ta;
  const sangria = indentOf(v.slice(lineStart(v, s), s));
  const antes = v.slice(lineStart(v, s), s).trimEnd().slice(-1);
  const despues = v.slice(t, lineEnd(v, t)).trimStart().slice(0, 1);

  if (antes === '{' && despues === '}') {
    // deja el cursor en una linea propia entre las llaves
    const texto = `\n${sangria}${TAB}\n${sangria}`;
    replaceRange(ta, s, t, texto, s + 1 + sangria.length + TAB.length);
    return;
  }
  replaceRange(ta, s, t, '\n' + sangria + (antes === '{' ? TAB : ''));
}

/** Cierra pares al abrirlos, y saltea el cierre si ya esta escrito. */
function autoPair(e: React.KeyboardEvent<TA>, ta: TA): boolean {
  const { value: v, selectionStart: s, selectionEnd: t } = ta;
  const k = e.key;
  const siguiente = v[t] ?? '';

  if (s === t && siguiente === k && CLOSERS.has(k)) {
    e.preventDefault();
    ta.setSelectionRange(s + 1, s + 1);
    return true;
  }

  const cierre = PAIRS[k];
  if (!cierre) return false;

  if (s !== t) {
    e.preventDefault();
    replaceRange(ta, s, t, k + v.slice(s, t) + cierre, s + 1, t + 1);
    return true;
  }
  if (siguiente === '' || /[\s)\]}]/.test(siguiente)) {
    e.preventDefault();
    replaceRange(ta, s, t, k + cierre, s + 1);
    return true;
  }
  return false;
}

/** Borra el par vacio de un saque, o un nivel entero de sangria. */
function smartBackspace(e: React.KeyboardEvent<TA>, ta: TA) {
  const { value: v, selectionStart: s, selectionEnd: t } = ta;
  if (s !== t || s === 0) return;

  if (PAIRS[v[s - 1]] === v[s]) {
    e.preventDefault();
    replaceRange(ta, s - 1, s + 1, '');
    return;
  }
  const antes = v.slice(lineStart(v, s), s);
  if (antes.length >= 2 && /^ +$/.test(antes) && antes.length % 2 === 0) {
    e.preventDefault();
    replaceRange(ta, s - 2, s, '');
  }
}

/** Cmd/Ctrl + / sobre las lineas que toca la seleccion. */
function toggleComment(ta: TA) {
  const { value: v, selectionStart: s, selectionEnd: t } = ta;
  const desde = lineStart(v, s);
  const hasta = lineEnd(v, t);
  const lineas = v.slice(desde, hasta).split('\n');
  const utiles = lineas.filter((l) => l.trim() !== '');
  if (utiles.length === 0) return;

  const comentadas = utiles.every((l) => l.trimStart().startsWith('//'));
  const sangria = Math.min(...utiles.map((l) => indentOf(l).length));

  const texto = lineas.map((l) => {
    if (l.trim() === '') return l;
    if (comentadas) return l.replace(/^(\s*)\/\/ ?/, '$1');
    return l.slice(0, sangria) + '// ' + l.slice(sangria);
  }).join('\n');

  replaceRange(ta, desde, hasta, texto, desde, desde + texto.length);
}

/**
 * Atajos de edicion del textarea del editor: sangria con Tab, Enter que conserva la sangria,
 * pares que se cierran solos y Cmd/Ctrl + / para comentar.
 */
export function handleEditingKey(e: React.KeyboardEvent<TA>) {
  const ta = e.currentTarget;

  if ((e.metaKey || e.ctrlKey) && e.key === '/') {
    e.preventDefault();
    toggleComment(ta);
    return;
  }
  // el resto de los atajos con modificador son del navegador (undo, copiar, ...)
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  if (e.key === 'Tab') { e.preventDefault(); indent(ta, e.shiftKey); return; }
  if (e.key === 'Enter') { e.preventDefault(); newLine(ta); return; }
  if (e.key === 'Backspace') { smartBackspace(e, ta); return; }
  autoPair(e, ta);
}
