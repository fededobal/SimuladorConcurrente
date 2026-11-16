import { h, watch } from 'vue';
import DefaultTheme from 'vitepress/theme';
import { useData, type Theme } from 'vitepress';
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
 * Tema por defecto con un botón "Volver al simulador" en lugar del título de la barra. El
 * simulador vive en la raíz del mismo sitio; como el enrutador de VitePress intercepta los
 * clics a la misma dirección y buscaría "/" dentro de la documentación, la navegación se
 * hace a mano con location.assign.
 */
export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      // fuera del enlace del titulo (que el tema deja aunque no haya titulo): un enlace
      // adentro de otro dejaba un area clicable vacia y una linea divisoria de mas
      'nav-bar-content-before': () =>
        h('a', {
          class: 'volver-simulador',
          href: '/',
          onClick: (e: MouseEvent) => {
            e.preventDefault();
            window.location.assign('/');
          },
        }, [h('span', { 'aria-hidden': 'true' }, '←'), ' Volver al simulador']),
    });
  },
  enhanceApp({ router }) {
    instalarResaltadoDeBusqueda(router);
  },
  setup() {
    fijarTemaElegido();
  },
} satisfies Theme;
