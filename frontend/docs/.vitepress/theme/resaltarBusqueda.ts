import { nextTick } from 'vue';
import type { Router } from 'vitepress';

/**
 * Resalta en el artículo la palabra que se buscó. El buscador de VitePress lleva a la
 * sección pero no marca el término; acá se toma el texto del campo de búsqueda cuando se
 * elige una coincidencia (clic o Enter) y, cargada la página, se envuelven las apariciones
 * en <mark>. El resaltado se quita con un clic en el artículo, con Escape o al navegar.
 */
export function instalarResaltadoDeBusqueda(router: Router) {
  if (typeof window === 'undefined') return;

  let pendiente: string | null = null;
  const campo = () => document.getElementById('localsearch-input') as HTMLInputElement | null;

  // clic en una coincidencia
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest('.VPLocalSearchBox a.result');
    if (a) pendiente = campo()?.value.trim() || null;
  }, true);
  // Enter sobre el campo con una coincidencia seleccionada
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).id === 'localsearch-input') {
      pendiente = campo()?.value.trim() || null;
    }
  }, true);

  const anterior = router.onAfterRouteChange;
  router.onAfterRouteChange = async (to) => {
    await anterior?.(to);
    quitar();
    if (!pendiente) return;
    const termino = pendiente;
    pendiente = null;
    await nextTick();
    // la pagina puede tardar un cuadro mas en pintar el contenido
    requestAnimationFrame(() => resaltar(termino));
  };

  document.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.vp-doc')) quitar();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') quitar();
  });
}

/** Palabras del término, ignorando acentos y mayúsculas, como hace el buscador. */
function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function resaltar(termino: string) {
  const doc = document.querySelector('.vp-doc');
  if (!doc) return;
  const palabras = termino.split(/\s+/).map(normalizar).filter((p) => p.length >= 2);
  if (palabras.length === 0) return;

  const walker = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      const padre = n.parentElement;
      if (!padre || padre.closest('script, style, mark.busqueda')) return NodeFilter.FILTER_REJECT;
      return n.textContent && n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const nodos: Text[] = [];
  while (walker.nextNode()) nodos.push(walker.currentNode as Text);

  let primero: HTMLElement | null = null;
  for (const nodo of nodos) {
    const texto = nodo.textContent ?? '';
    const plano = normalizar(texto);
    // la normalizacion no cambia la longitud (solo quita diacriticos combinantes y baja
    // mayusculas), asi que los indices de 'plano' valen para 'texto'
    if (plano.length !== texto.length) continue;
    const tramos: Array<[number, number]> = [];
    for (const p of palabras) {
      let i = plano.indexOf(p);
      while (i >= 0) {
        tramos.push([i, i + p.length]);
        i = plano.indexOf(p, i + p.length);
      }
    }
    if (tramos.length === 0) continue;
    tramos.sort((a, b) => a[0] - b[0]);

    const frag = document.createDocumentFragment();
    let pos = 0;
    for (const [desde, hasta] of tramos) {
      if (desde < pos) continue;
      frag.appendChild(document.createTextNode(texto.slice(pos, desde)));
      const mark = document.createElement('mark');
      mark.className = 'busqueda';
      mark.textContent = texto.slice(desde, hasta);
      frag.appendChild(mark);
      primero ??= mark;
      pos = hasta;
    }
    frag.appendChild(document.createTextNode(texto.slice(pos)));
    nodo.parentNode?.replaceChild(frag, nodo);
  }
  // si el ancla de la seccion no dejo la primera aparicion a la vista, acercarla
  if (primero) {
    const r = primero.getBoundingClientRect();
    if (r.top < 80 || r.bottom > window.innerHeight) {
      primero.scrollIntoView({ block: 'center' });
    }
  }
}

function quitar() {
  for (const mark of document.querySelectorAll('mark.busqueda')) {
    const padre = mark.parentNode;
    if (!padre) continue;
    padre.replaceChild(document.createTextNode(mark.textContent ?? ''), mark);
    padre.normalize();
  }
}
