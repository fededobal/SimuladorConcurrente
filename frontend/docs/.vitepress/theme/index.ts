import { h } from 'vue';
import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { instalarResaltadoDeBusqueda } from './resaltarBusqueda';
import './custom.css';

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
} satisfies Theme;
