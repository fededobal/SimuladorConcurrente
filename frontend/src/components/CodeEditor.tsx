import { useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  /** Duracion de un instante, en ms: el deslizamiento se acompasa a la simulacion. */
  pasoMs: number;
}

// Valores de arranque, iguales a --pad-top y --line-h de index.css. No se usan para
// posicionar: apenas monta, se miden los reales del DOM. Duplicar la metrica en el CSS y en
// el JS es como se desalinean las franjas cuando una de las dos cambia.
const PAD_TOP = 14;
const LINE_H = 22;

/** Ancho aproximado de un caracter de la etiqueta (10px, tipografia sans). */
const ANCHO_CHAR = 5.6;
const HUECO_ETIQUETA = 10;

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
  push: 'tok-ctrl', pop: 'tok-ctrl', empty: 'tok-ctrl', write: 'tok-ctrl',

  int: 'tok-type', double: 'tok-type', boolean: 'tok-type', text: 'tok-type',
  Cola: 'tok-type', ColaOrdenada: 'tok-type',
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

export function CodeEditor({ code, onChange, readOnly, activeLines, errorLine, pasoMs }: Props) {
  // El deslizamiento ocupa la mayor parte del instante pero termina antes del siguiente:
  // si durara lo mismo, las franjas nunca se verian quietas sobre el renglon que ejecutan.
  // Corto y con salida rapida: la franja llega enseguida al renglon y se queda ahi. Si el
  // deslizamiento ocupara casi todo el instante, la banda pasaria mas tiempo entre dos
  // renglones que sobre el que se esta ejecutando, que es justo lo que hay que evitar.
  const desliz = Math.min(Math.round(pasoMs * 0.45), 260);

  // La metrica real del texto, leida del DOM. Con line-height fraccionario (o si cambia el
  // tamano de fuente) el calculo a mano se va corriendo un poco por renglon y termina
  // desalineado varias lineas mas abajo.
  const capaRef = useRef<HTMLPreElement>(null);
  const [metrica, setMetrica] = useState({ top: PAD_TOP, alto: LINE_H });

  useLayoutEffect(() => {
    const capa = capaRef.current;
    if (!capa) return;
    const medir = () => {
      // Para obtener la posicion real de los renglones medimos con un par de <span>
      // efimeros en vez de confiar en getComputedStyle: asi el stripe queda alineado
      // pase lo que pase con la fuente, el zoom o la resolucion de pantalla.
      //
      // Los spans se insertan como inline-block de ancho/alto cero al comienzo del
      // <pre>; su offset vertical coincide con el tope de la linea en la que caen.
      // El primer \n del <pre> basta para que el segundo span baje a la 2da linea.
      const probe = document.createElement('span');
      probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:top;';
      const probe2 = probe.cloneNode() as HTMLSpanElement;

      // Insertar al inicio (antes del primer caracter de la 1ra linea).
      capa.insertBefore(probe, capa.firstChild);
      // Insertar justo despues del primer \n (inicio de la 2da linea).
      // Buscamos el primer TextNode que contenga \n.
      let inserted2 = false;
      const walker = document.createTreeWalker(capa, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const tn = walker.currentNode as Text;
        const nlIdx = tn.textContent!.indexOf('\n');
        if (nlIdx >= 0) {
          // Partir el texto en dos: antes-del-\n y despues-del-\n, insertar probe2 despues del split.
          const after = tn.splitText(nlIdx + 1);
          after.parentNode!.insertBefore(probe2, after);
          inserted2 = true;
          break;
        }
      }

      if (inserted2) {
        const areaRect = capa.offsetParent?.getBoundingClientRect()
          ?? capa.parentElement!.getBoundingClientRect();
        const r0 = probe.getBoundingClientRect();
        const r1 = probe2.getBoundingClientRect();
        const top = r0.top - areaRect.top;
        const alto = r1.top - r0.top;
        if (alto > 0) {
          setMetrica((prev) =>
            prev.alto === alto && prev.top === top ? prev : { top, alto },
          );
        }
      }

      // Limpiar: quitar los probes y reunir los nodos de texto partidos.
      probe.remove();
      probe2.remove();
      capa.normalize();

      // Si no pudimos medir (contenido vacio), caemos al calculo CSS.
      if (!inserted2) {
        const cs = getComputedStyle(capa);
        const alto = parseFloat(cs.lineHeight);
        const top = parseFloat(cs.paddingTop);
        if (Number.isFinite(alto) && alto > 0 && Number.isFinite(top)) {
          setMetrica((prev) => (prev.alto === alto && prev.top === top ? prev : { top, alto }));
        }
      }
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(capa);
    return () => obs.disconnect();
  }, []);

  const yDe = (linea: number) => metrica.top + (linea - 1) * metrica.alto;
  const lines = code.split('\n');

  // Una franja POR PROCESO, no por linea. Es lo que hace que el avance se vea suave: al
  // moverse de renglon sobrevive el mismo nodo del DOM y la transicion de CSS lo desliza.
  // Si se agrupara por linea, React desmontaria la franja vieja y montaria otra, y no hay
  // nada que animar entre dos elementos distintos.
  const marcas = useMemo(() => {
    const porLinea = new Map<number, ActiveLine[]>();
    for (const a of activeLines) {
      if (a.line < 1) continue;
      const list = porLinea.get(a.line) ?? [];
      list.push(a);
      porLinea.set(a.line, list);
    }
    // Ahora que avanzan varios procesos a la vez, compartir renglon es normal: las
    // etiquetas se corren para no taparse entre si.
    const salida: Array<ActiveLine & { corrimiento: number }> = [];
    for (const procs of porLinea.values()) {
      procs.sort((x, y) => RANK[x.state] - RANK[y.state] || x.name.localeCompare(y.name));
      let corrimiento = 0;
      for (const p of procs) {
        salida.push({ ...p, corrimiento });
        corrimiento += p.name.length * ANCHO_CHAR + HUECO_ETIQUETA;
      }
    }
    return salida;
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
    <div className="editor" style={{ ['--desliz' as string]: `${desliz}ms` }}>
      <div className="doc">
        <div className="gutter">{lines.map((_, i) => `${i + 1}\n`).join('')}</div>
        <div className="area">
          <pre ref={capaRef} className="layer" dangerouslySetInnerHTML={{ __html: highlight(code) + '\n' }} />

          {marcas.map((p) => (
            <div
              key={p.name}
              className="stripe"
              style={{
                top: yDe(p.line),
                height: metrica.alto,
                ...stripeStyle(p.color, p.state),
                zIndex: RANK[p.state] === 0 ? 2 : 1,
              }}
            >
              <span
                className="who"
                style={{
                  color: p.color,
                  opacity: NAME_ALPHA[p.state],
                  transform: `translateX(${-p.corrimiento}px)`,
                }}
              >
                {p.name}
              </span>
            </div>
          ))}

          {errorLine != null && (
            <div
              className="stripe"
              style={{
                top: yDe(errorLine),
                height: metrica.alto,
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
      background: `color-mix(in srgb, ${color} 5%, transparent)`,
      borderLeft: `2px solid color-mix(in srgb, ${color} 50%, transparent)`,
    };
  }
  return {
    background: `color-mix(in srgb, ${color} 13%, transparent)`,
    borderLeft: `2px solid ${color}`,
  };
}
