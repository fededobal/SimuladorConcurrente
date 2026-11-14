import { defineComponent, h, onMounted, ref } from 'vue';
import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { instalarResaltadoDeBusqueda } from './resaltarBusqueda';
import './custom.css';

const CLAVE_BARRA = 'docs.barraLateralOculta';

/**
 * Lo que va en el lugar del título de la barra: el botón para ocultar o mostrar la barra
 * lateral y el botón "Volver al simulador". El simulador vive en la raíz del mismo sitio;
 * como el enrutador de VitePress intercepta los clics a la misma dirección y buscaría "/"
 * dentro de la documentación, la navegación se hace a mano con location.assign.
 */
const Controles = defineComponent({
  setup() {
    const oculta = ref(false);
    const aplicar = () => {
      document.documentElement.classList.toggle('barra-oculta', oculta.value);
      try {
        localStorage.setItem(CLAVE_BARRA, oculta.value ? '1' : '0');
      } catch {
        // sin almacenamiento: la eleccion dura lo que dura la pagina
      }
    };
    onMounted(() => {
      try {
        oculta.value = localStorage.getItem(CLAVE_BARRA) === '1';
      } catch {
        oculta.value = false;
      }
      document.documentElement.classList.toggle('barra-oculta', oculta.value);
    });
    return () => h('div', { class: 'controles-barra' }, [
      h('button', {
        type: 'button',
        class: 'alternar-barra',
        'aria-label': oculta.value ? 'Mostrar el índice' : 'Ocultar el índice',
        'aria-pressed': oculta.value,
        title: oculta.value ? 'Mostrar el índice' : 'Ocultar el índice',
        onClick: () => { oculta.value = !oculta.value; aplicar(); },
      }, h('span', { 'aria-hidden': 'true' }, '☰')),
      h('a', {
        class: 'volver-simulador',
        href: '/',
        onClick: (e: MouseEvent) => {
          e.preventDefault();
          window.location.assign('/');
        },
      }, [h('span', { 'aria-hidden': 'true' }, '←'), ' Volver al simulador']),
    ]);
  },
});

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'nav-bar-title-after': () => h(Controles),
    });
  },
  enhanceApp({ router }) {
    instalarResaltadoDeBusqueda(router);
  },
} satisfies Theme;
