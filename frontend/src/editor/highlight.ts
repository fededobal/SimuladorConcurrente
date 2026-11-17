// Coloreado del lenguaje de monitores para el editor.

/** Clases de color de un token; el CSS de cada una esta en index.css (`.tok-*`). */
export type TokenClass = 'tok-decl' | 'tok-sync' | 'tok-ctrl' | 'tok-type' | 'tok-lit' | 'tok-comment';

/**
 * Mismas palabras reservadas que Lexer.KEYWORDS en el nucleo, en minuscula: como en el
 * Lexer, se aceptan con cualquier combinacion de mayusculas (OR, OUT, colaOrdenada). De esta
 * tabla sale tambien la gramatica con que la documentacion colorea los ejemplos
 * (docs/.vitepress/monitoresLanguage.ts): una palabra nueva se agrega solo aca.
 */
export const KEYWORDS: Readonly<Record<string, TokenClass>> = {
  monitor: 'tok-decl', procedure: 'tok-decl', cond: 'tok-decl', process: 'tok-decl',

  wait: 'tok-sync', signal: 'tok-sync', signal_all: 'tok-sync',

  if: 'tok-ctrl', else: 'tok-ctrl', while: 'tok-ctrl', for: 'tok-ctrl', skip: 'tok-ctrl',
  and: 'tok-ctrl', or: 'tok-ctrl', not: 'tok-ctrl', mod: 'tok-ctrl',
  push: 'tok-ctrl', pop: 'tok-ctrl', empty: 'tok-ctrl', write: 'tok-ctrl', delay: 'tok-sync',

  int: 'tok-type', double: 'tok-type', bool: 'tok-type', text: 'tok-type',
  cola: 'tok-type', colaordenada: 'tok-type',
  in: 'tok-type', out: 'tok-type',

  true: 'tok-lit', false: 'tok-lit',
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function span(cls: TokenClass, s: string): string {
  return `<span class="${cls}">${escapeHtml(s)}</span>`;
}

const DIGITO = /[0-9]/;
const INICIO_IDENT = /[A-Za-z_]/;
const IDENT = /[A-Za-z0-9_]/;

/**
 * Devuelve el HTML coloreado de un programa. Recorre el codigo igual que el lexer del nucleo
 * en vez de encadenar reemplazos de regex. Asi un `//` dentro de una cadena no arranca un comentario y una palabra
 * reservada dentro de un comentario no se colorea como codigo.
 */
export function highlight(code: string): string {
  let out = '';
  let i = 0;
  const n = code.length;

  while (i < n) {
    const c = code[i];

    if (c === '/' && code[i + 1] === '/') {
      let j = code.indexOf('\n', i);
      if (j < 0) j = n;
      out += span('tok-comment', code.slice(i, j));
      i = j;
      continue;
    }
    if (c === '/' && code[i + 1] === '*') {
      const cierre = code.indexOf('*/', i + 2);
      const j = cierre < 0 ? n : cierre + 2;
      out += span('tok-comment', code.slice(i, j));
      i = j;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      while (j < n && code[j] !== '"' && code[j] !== '\n') j++;
      if (code[j] === '"') j++;
      out += span('tok-lit', code.slice(i, j));
      i = j;
      continue;
    }
    if (DIGITO.test(c)) {
      let j = i;
      while (j < n && DIGITO.test(code[j])) j++;
      if (code[j] === '.' && DIGITO.test(code[j + 1] ?? '')) {
        j++;
        while (j < n && DIGITO.test(code[j])) j++;
      }
      out += span('tok-lit', code.slice(i, j));
      i = j;
      continue;
    }
    if (INICIO_IDENT.test(c)) {
      let j = i;
      while (j < n && IDENT.test(code[j])) j++;
      const palabra = code.slice(i, j);
      const clave = palabra.toLowerCase();
      // hasOwn: 'constructor' o 'toString' no son palabras reservadas aunque el objeto las herede
      const cls = Object.hasOwn(KEYWORDS, clave) ? KEYWORDS[clave] : undefined;
      out += cls ? span(cls, palabra) : escapeHtml(palabra);
      i = j;
      continue;
    }

    out += escapeHtml(c);
    i++;
  }
  return out;
}
