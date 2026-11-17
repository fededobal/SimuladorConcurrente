import type MarkdownIt from 'markdown-it';
import { ejemploIgualA, ejemploPorId, esProgramaCompleto, fragmentoPara, guia } from './guia';

// Dos agregados al Markdown de la guia:
//  - el numero de seccion delante del titulo de cada pagina ("2.9.8 wait");
//  - el boton "Abrir en el simulador" en los ejemplos de codigo.

/** "lenguaje/instrucciones/wait.md" -> "/lenguaje/instrucciones/wait"; "lenguaje/index.md" -> "/lenguaje/". */
function enlaceDe(rutaRelativa: string): string {
  return '/' + rutaRelativa.replace(/\.md$/, '').replace(/(^|\/)index$/, '$1');
}

/** Pone el numero de seccion de la pagina delante de su primer titulo. */
export function numeroDeSeccion(md: MarkdownIt): void {
  md.core.ruler.push('numero-de-seccion', (state) => {
    const pagina = guia.paginas[enlaceDe((state.env as { relativePath?: string }).relativePath ?? '')];
    if (!pagina) return;
    const i = state.tokens.findIndex((t) => t.type === 'heading_open' && t.tag === 'h1');
    const texto = state.tokens[i + 1];
    if (i < 0 || !texto?.children) return;
    const numero = new state.Token('html_inline', '', 0);
    numero.content = `<span class="sec-num">${pagina.numero}</span>`;
    texto.children.unshift(numero);
  });
}

function escapar(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * Agrega "Abrir en el simulador" a los bloques ```monitores:
 *  - si el bloque es un programa completo (compila), el boton abre ese mismo programa;
 *  - si es un fragmento marcado con `ejemplo=<id>`, abre ese ejemplo del menu y el encabezado
 *    dice de cual salio.
 * El enlace va con target="_self": sin el, el enrutador de VitePress lo toma como una pagina
 * de la guia y no sale hacia el simulador.
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

    let destino: string | null = null;
    if (ejemplo) destino = `/#ejemplo=${ejemplo.id}`;
    else if (esProgramaCompleto(token.content)) {
      destino = `/#${fragmentoPara('Ejemplo de la guía', token.content)}`;
    }
    if (destino === null) return html;

    const origen = marcado ? `<span class="origen">del ejemplo ${escapar(marcado.titulo)}</span>` : '';
    const boton = `<a class="abrir-sim" href="${escapar(destino)}" target="_self">Abrir en el simulador</a>`;
    // dentro del bloque, antes del codigo: el CSS los ubica en el encabezado
    return html.replace('<pre', `${origen}${boton}<pre`);
  };
}
