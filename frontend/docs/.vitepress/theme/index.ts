import { h, watch } from 'vue';
import DefaultTheme from 'vitepress/theme';
import { useData, type Theme } from 'vitepress';
import Chips from './components/Chips.vue';
import FiguraMonitor from './components/FiguraMonitor.vue';
import Migas from './components/Migas.vue';
import Portada from './components/Portada.vue';
import Relacionadas from './components/Relacionadas.vue';
import { instalarResaltadoDeBusqueda } from './resaltarBusqueda';
import './custom.css';

/** Clave donde VitePress guarda el tema; el simulador lee la misma (src/useTheme.ts). */
const CLAVE_TEMA = 'vitepress-theme-appearance';

function leerTema(): string | null {
  try {
    return localStorage.getItem(CLAVE_TEMA);
  } catch {
    return null;
  }
}

/**
 * Guarda el tema elegido tal cual, como el botón del simulador. VitePress (useDark de
 * VueUse) guarda "auto" cuando lo elegido coincide con el sistema, y entonces la elección
 * no se sostiene: si el sistema cambia, cambia el tema.
 *
 * Ese "auto" se distingue del "auto" de quien nunca eligió porque antes había un tema fijo.
 * Solo en ese caso se lo reemplaza por "light" o "dark", y un evento `storage` hace que
 * VueUse relea la clave y deje de seguir al sistema. Si el tema cambia porque cambió el
 * sistema y nadie eligió nada, no se toca.
 */
function fijarTemaElegido() {
  const { isDark } = useData();
  let anterior = leerTema();
  // flush 'post': corre después del watch con que VueUse escribe la clave
  watch(isDark, (oscuro) => {
    const actual = leerTema();
    if (actual === 'auto' && anterior !== null && anterior !== 'auto') {
      const fijo = oscuro ? 'dark' : 'light';
      try {
        localStorage.setItem(CLAVE_TEMA, fijo);
        window.dispatchEvent(new StorageEvent('storage', {
          key: CLAVE_TEMA, newValue: fijo, storageArea: localStorage,
        }));
      } catch {
        // sin almacenamiento: el tema dura lo que dura la pestaña
      }
    }
    anterior = leerTema();
  }, { flush: 'post' });
}

/**
 * Tema por defecto, vestido como un libro: migas con el numero de seccion en la barra
 * superior, el boton "Abrir el simulador" a la derecha, capitulos numerados en la barra
 * lateral y paginas relacionadas bajo el indice de cada pagina.
 *
 * El simulador vive en la raiz del mismo sitio. El enrutador de VitePress intercepta los
 * clics a la misma direccion y buscaria "/" dentro de la guia; por eso los enlaces al
 * simulador llevan target="_self", que el enrutador deja pasar.
 */
export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'nav-bar-content-before': () => h(Migas),
      'nav-bar-content-after': () =>
        h('a', { class: 'abrir-simulador', href: '/', target: '_self' },
          ['Abrir el simulador ', h('span', { 'aria-hidden': 'true' }, '↗')]),
      'sidebar-nav-before': () => h('p', { class: 'capitulos-titulo' }, 'Capítulos'),
      'aside-outline-after': () => h(Relacionadas),
    });
  },
  enhanceApp({ app, router }) {
    // componentes que se usan desde el Markdown de las paginas
    app.component('Chips', Chips);
    app.component('FiguraMonitor', FiguraMonitor);
    app.component('Portada', Portada);
    instalarResaltadoDeBusqueda(router);
  },
  setup() {
    fijarTemaElegido();
  },
} satisfies Theme;
