import type MarkdownIt from 'markdown-it';
import type { StateCore, Token } from 'markdown-it';
import { ejemploIgualA, ejemploPorId, esProgramaCompleto, fragmentoPara, guia } from './guia';

// Agregados al Markdown de la guia:
//  - el numero de seccion delante del titulo de cada pagina ("2.9.8 wait");
//  - el boton "Abrir en el simulador" en los ejemplos de codigo;
//  - la ejecucion en el lugar de los ejemplos que son un programa completo.

/** "lenguaje/instrucciones/wait.md" -> "/lenguaje/instrucciones/wait"; "lenguaje/index.md" -> "/lenguaje/". */
function enlaceDe(rutaRelativa: string): string {
  return '/' + rutaRelativa.replace(/\.md$/, '').replace(/(^|\/)index$/, '$1');
}

function htmlEnLinea(state: StateCore, contenido: string): Token {
  const token = new state.Token('html_inline', '', 0);
  token.content = contenido;
  return token;
}

/**
 * Pone el numero de seccion de la pagina delante de su primer titulo:
 * <h1><span class="sec-num">7.4</span> <span class="sec-titulo">Programas de ejemplo</span></h1>.
 * El h1 es flex, asi que el texto va en un solo span: si no, cada pieza (un `codigo`, o el
 * <mark> del resaltado de la busqueda) seria un elemento aparte y el gap partiria las palabras
 * ("As ignación"). El espacio entre los dos span separa el numero del titulo en el buscador,
 * que indexa el texto sin etiquetas ("7.4 Programas", no "7.4Programas"); en pantalla no se
 * ve, porque el espacio entre elementos flex se descarta.
 */
export function numeroDeSeccion(md: MarkdownIt): void {
  md.core.ruler.push('numero-de-seccion', (state) => {
    const pagina = guia.paginas[enlaceDe((state.env as { relativePath?: string }).relativePath ?? '')];
    if (!pagina) return;
    const i = state.tokens.findIndex((t) => t.type === 'heading_open' && t.tag === 'h1');
    const texto = state.tokens[i + 1];
    if (i < 0 || !texto?.children) return;
    const hijos = texto.children;
    // el ancla "#" del titulo, si ya esta, queda fuera del span del texto
    const ancla = hijos.findIndex((t) => t.type === 'link_open' && t.attrGet('class') === 'header-anchor');
    hijos.splice(ancla < 0 ? hijos.length : ancla, 0, htmlEnLinea(state, '</span>'));
    hijos.unshift(
      htmlEnLinea(state, `<span class="sec-num">${pagina.numero}</span> `),
      htmlEnLinea(state, '<span class="sec-titulo">'),
    );
  });
}

function escapar(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** El programa en base64 para URL: viaja en un atributo del bloque (ver theme/ejecucion.ts). */
function enBase64(codigo: string): string {
  return Buffer.from(codigo, 'utf8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Agrega "Abrir en el simulador" a los bloques ```monitores:
 *  - si el bloque es un programa completo (compila), el boton abre ese mismo programa;
 *  - si es un fragmento marcado con `ejemplo=<id>`, abre ese ejemplo del menu y el encabezado
 *    dice de cual salio.
 * El enlace va con target="_self": sin el, el enrutador de VitePress lo toma como una pagina
 * de la guia y no sale hacia el simulador.
 *
 * Ademas, un bloque que es un programa completo queda envuelto en <EjemploEjecutable>, que
 * lo ejecuta en la misma pagina. Un fragmento no se puede ejecutar solo y queda como esta.
 */
export function abrirEnElSimulador(md: MarkdownIt): void {
  const original = md.renderer.rules.fence;
  if (!original) return;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const html = original(tokens, idx, options, env, self);
    const token = tokens[idx];
    const [lenguaje, ...resto] = token.info.trim().split(/\s+/);
    if (lenguaje !== 'monitores') return html;

    const idMarcado = resto.find((r) => r.startsWith('ejemplo='))?.slice('ejemplo='.length);
    const marcado = idMarcado ? ejemploPorId(idMarcado) : undefined;
    if (idMarcado && !marcado) {
      throw new Error(`${(env as { relativePath?: string }).relativePath}: no existe el ejemplo "${idMarcado}"`);
    }
    const igual = marcado ? undefined : ejemploIgualA(token.content);
    const ejemplo = marcado ?? igual;
    const completo = esProgramaCompleto(token.content);

    let destino: string | null = null;
    if (ejemplo) destino = `/#ejemplo=${ejemplo.id}`;
    else if (completo) destino = `/#${fragmentoPara('Ejemplo de la guía', token.content)}`;
    if (destino === null) return html;

    const origen = marcado ? `<span class="origen">del ejemplo ${escapar(marcado.titulo)}</span>` : '';
    const boton = `<a class="abrir-sim" href="${escapar(destino)}" target="_self">Abrir en el simulador</a>`;
    // dentro del bloque, antes del codigo: el CSS los ubica en el encabezado
    const bloque = html.replace('<pre', `${origen}${boton}<pre`);
    if (!completo) return bloque;
    return `<EjemploEjecutable codigo="${enBase64(token.content)}">${bloque}</EjemploEjecutable>`;
  };
}
