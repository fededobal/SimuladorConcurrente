import { h } from 'vue';
import DefaultTheme from 'vitepress/theme';
import './custom.css';

/**
 * Tema por defecto más un enlace al simulador en la barra. Va como enlace propio y no como
 * item de `nav` porque VitePress antepone la base (/docs/) a todo enlace interno, y el
 * simulador vive en la raíz del mismo sitio.
 */
export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'nav-bar-content-after': () =>
        h('a', { class: 'enlace-simulador', href: '/' }, 'Simulador'),
    });
  },
};
