import { useMemo } from 'react';
import type { ProcessState } from '../types';

export interface ActiveLine {
  line: number;
  color: string;
  state: ProcessState;
  name: string;
}

interface Props {
  code: string;
  onChange: (code: string) => void;
  readOnly: boolean;
  activeLines: ActiveLine[];
  errorLine: number | null;
}

// Tienen que coincidir con --pad-top y --line-h de index.css:
// con eso la franja cae exactamente sobre su renglon.
const PAD_TOP = 14;
const LINE_H = 22;

/** Sangria de un nivel. El lenguaje no usa tabs. */
const TAB = '  ';

const RANK: Record<ProcessState, number> = {
  RUNNING: 0, BLOCKED: 1, READY: 2, TERMINATED: 3,
};

const NAME_ALPHA: Record<ProcessState, number> = {
  RUNNING: 1, BLOCKED: 0.8, READY: 0.45, TERMINATED: 0.3,
};

// ===================================================================== pintado

/** Mismas palabras reservadas que Lexer.KEYWORDS en el backend. */
const KEYWORDS: Record<string, string> = {
  monitor: 'tok-decl', procedure: 'tok-decl', cond: 'tok-decl', process: 'tok-decl',

  wait: 'tok-sync', signal: 'tok-sync', signal_all: 'tok-sync',

  if: 'tok-ctrl', else: 'tok-ctrl', while: 'tok-ctrl', for: 'tok-ctrl', skip: 'tok-ctrl',
  and: 'tok-ctrl', or: 'tok-ctrl', not: 'tok-ctrl',
  push: 'tok-ctrl', pop: 'tok-ctrl', empty: 'tok-ctrl',

  int: 'tok-type', double: 'tok-type', boolean: 'tok-type', text: 'tok-type', Cola: 'tok-type',
  in: 'tok-type', out: 'tok-type',

  true: 'tok-lit', false: 'tok-lit',
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function span(cls: string, s: string): string {
  return `<span class="${cls}">${escapeHtml(s)}</span>`;
}

const DIGITO = /[0-9]/;
const INICIO_IDENT = /[A-Za-z_]/;
const IDENT = /[A-Za-z0-9_]/;

/**
 * Recorre el codigo igual que el lexer del backend en vez de encadenar reemplazos
 * de regex. Asi un `//` dentro de una cadena no arranca un comentario y una palabra
 * reservada dentro de un comentario no se colorea como codigo.
 */
function highlight(code: string): string {
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
      const cls = KEYWORDS[palabra];
      out += cls ? span(cls, palabra) : escapeHtml(palabra);
      i = j;
      continue;
    }

    out += escapeHtml(c);
    i++;
  }
  return out;
}

// ===================================================================== edicion

type TA = HTMLTextAreaElement;

const PARES: Record<string, string> = { '{': '}', '(': ')', '[': ']', '"': '"' };
const CIERRES = new Set(['}', ')', ']', '"']);

const inicioLinea = (v: string, i: number) => v.lastIndexOf('\n', i - 1) + 1;

function finLinea(v: string, i: number) {
  const j = v.indexOf('\n', i);
  return j < 0 ? v.length : j;
}

const sangriaDe = (l: string) => l.slice(0, l.length - l.trimStart().length);

/**
 * Reemplaza [desde, hasta) por `texto` a traves de execCommand para no romper el
 * undo/redo nativo del textarea: escribir en `value` a mano vacia la pila de deshacer
 * del navegador. El `input` que dispara execCommand es el que ve React.
 */
function reemplazar(ta: TA, desde: number, hasta: number, texto: string, selA?: number, selB?: number) {
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
function sangrar(ta: TA, quitar: boolean) {
  const { value: v, selectionStart: s, selectionEnd: t } = ta;
  const desde = inicioLinea(v, s);
  const hasta = finLinea(v, t);

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
  reemplazar(ta, desde, hasta, texto, Math.max(desde, s + dPrimera), Math.max(desde, t + dTotal));
}

/** Enter manteniendo la sangria, un nivel mas despues de '{'. */
function nuevaLinea(ta: TA) {
  const { value: v, selectionStart: s, selectionEnd: t } = ta;
  const sangria = sangriaDe(v.slice(inicioLinea(v, s), s));
  const antes = v.slice(inicioLinea(v, s), s).trimEnd().slice(-1);
  const despues = v.slice(t, finLinea(v, t)).trimStart().slice(0, 1);

  if (antes === '{' && despues === '}') {
    // deja el cursor en una linea propia entre las llaves
    const texto = `\n${sangria}${TAB}\n${sangria}`;
    reemplazar(ta, s, t, texto, s + 1 + sangria.length + TAB.length);
    return;
  }
  reemplazar(ta, s, t, '\n' + sangria + (antes === '{' ? TAB : ''));
}

/** Cierra pares al abrirlos, y saltea el cierre si ya esta escrito. */
function par(e: React.KeyboardEvent<TA>, ta: TA): boolean {
  const { value: v, selectionStart: s, selectionEnd: t } = ta;
  const k = e.key;
  const siguiente = v[t] ?? '';

  if (s === t && siguiente === k && CIERRES.has(k)) {
    e.preventDefault();
    ta.setSelectionRange(s + 1, s + 1);
    return true;
  }

  const cierre = PARES[k];
  if (!cierre) return false;

  if (s !== t) {
    e.preventDefault();
    reemplazar(ta, s, t, k + v.slice(s, t) + cierre, s + 1, t + 1);
    return true;
  }
  if (siguiente === '' || /[\s)\]}]/.test(siguiente)) {
    e.preventDefault();
    reemplazar(ta, s, t, k + cierre, s + 1);
    return true;
  }
  return false;
}

/** Borra el par vacio de un saque, o un nivel entero de sangria. */
function borrar(e: React.KeyboardEvent<TA>, ta: TA) {
  const { value: v, selectionStart: s, selectionEnd: t } = ta;
  if (s !== t || s === 0) return;

  if (PARES[v[s - 1]] === v[s]) {
    e.preventDefault();
    reemplazar(ta, s - 1, s + 1, '');
    return;
  }
  const antes = v.slice(inicioLinea(v, s), s);
  if (antes.length >= 2 && /^ +$/.test(antes) && antes.length % 2 === 0) {
    e.preventDefault();
    reemplazar(ta, s - 2, s, '');
  }
}

/** Cmd/Ctrl + / sobre las lineas que toca la seleccion. */
function comentar(ta: TA) {
  const { value: v, selectionStart: s, selectionEnd: t } = ta;
  const desde = inicioLinea(v, s);
  const hasta = finLinea(v, t);
  const lineas = v.slice(desde, hasta).split('\n');
  const utiles = lineas.filter((l) => l.trim() !== '');
  if (utiles.length === 0) return;

  const comentadas = utiles.every((l) => l.trimStart().startsWith('//'));
  const sangria = Math.min(...utiles.map((l) => sangriaDe(l).length));

  const texto = lineas.map((l) => {
    if (l.trim() === '') return l;
    if (comentadas) return l.replace(/^(\s*)\/\/ ?/, '$1');
    return l.slice(0, sangria) + '// ' + l.slice(sangria);
  }).join('\n');

  reemplazar(ta, desde, hasta, texto, desde, desde + texto.length);
}

// ===================================================================== componente

export function CodeEditor({ code, onChange, readOnly, activeLines, errorLine }: Props) {
  const lines = code.split('\n');

  const stripes = useMemo(() => {
    const byLine = new Map<number, ActiveLine[]>();
    for (const a of activeLines) {
      if (a.line < 1) continue;
      const list = byLine.get(a.line) ?? [];
      list.push(a);
      byLine.set(a.line, list);
    }
    return [...byLine.entries()].map(([line, procs]) => {
      procs.sort((x, y) => RANK[x.state] - RANK[y.state]);
      return { line, procs, lead: procs[0] };
    });
  }, [activeLines]);

  const onKeyDown = (e: React.KeyboardEvent<TA>) => {
    if (readOnly) return;
    const ta = e.currentTarget;

    if ((e.metaKey || e.ctrlKey) && e.key === '/') {
      e.preventDefault();
      comentar(ta);
      return;
    }
    // el resto de los atajos con modificador son del navegador (undo, copiar, ...)
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === 'Tab') { e.preventDefault(); sangrar(ta, e.shiftKey); return; }
    if (e.key === 'Enter') { e.preventDefault(); nuevaLinea(ta); return; }
    if (e.key === 'Backspace') { borrar(e, ta); return; }
    par(e, ta);
  };

  return (
    <div className="editor">
      <div className="doc">
        <div className="gutter">{lines.map((_, i) => `${i + 1}\n`).join('')}</div>
        <div className="area">
          <pre className="layer" dangerouslySetInnerHTML={{ __html: highlight(code) + '\n' }} />

          {stripes.map(({ line, procs, lead }) => (
            <div
              key={line}
              className="stripe"
              style={{ top: PAD_TOP + (line - 1) * LINE_H, ...stripeStyle(lead.color, lead.state) }}
            >
              {procs.map((p) => (
                <span
                  key={p.name}
                  className="who"
                  style={{ color: p.color, opacity: NAME_ALPHA[p.state] }}
                >
                  {p.name}
                </span>
              ))}
            </div>
          ))}

          {errorLine != null && (
            <div
              className="stripe"
              style={{
                top: PAD_TOP + (errorLine - 1) * LINE_H,
                background: 'color-mix(in srgb, var(--danger) 15%, transparent)',
                borderLeft: '2px solid var(--danger)',
              }}
            />
          )}

          <textarea
            value={code}
            spellCheck={false}
            readOnly={readOnly}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
      </div>
    </div>
  );
}

function stripeStyle(color: string, state: ProcessState): React.CSSProperties {
  if (state === 'BLOCKED') {
    return {
      background: `repeating-linear-gradient(135deg, color-mix(in srgb, ${color} 17%, transparent) 0 5px, transparent 5px 10px)`,
      borderLeft: `2px dashed ${color}`,
    };
  }
  if (state === 'READY') {
    return {
      background: `color-mix(in srgb, ${color} 7%, transparent)`,
      borderLeft: `2px solid color-mix(in srgb, ${color} 50%, transparent)`,
    };
  }
  return {
    background: `color-mix(in srgb, ${color} 18%, transparent)`,
    borderLeft: `2px solid ${color}`,
  };
}
