import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitepress';
import type { Plugin } from 'vite';
import { barraLateral, guia } from './guia';
import { abrirEnElSimulador, numeroDeSeccion } from './markdown';
import { monitoresDark, monitoresLanguage, monitoresLight } from './monitoresLanguage';

const FRONTEND = fileURLToPath(new URL('../../', import.meta.url));
const DOCS = fileURLToPath(new URL('../../../docs/', import.meta.url));

/**
 * Los .md viven en docs/, fuera de frontend/, y VitePress toma ese directorio como raiz de
 * Vite: un import de `vue` desde una pagina no encuentra node_modules. Este plugin vuelve a
 * resolver los imports de paquetes que salen de docs/ como si salieran de frontend/, sin
 * tocar la resolucion del resto (un alias de `vue` rompia el prebundle en desarrollo).
 */
function resolverDesdeFrontend(): Plugin {
  return {
    name: 'resolver-desde-frontend',
    enforce: 'pre',
    async resolveId(id, importer, options) {
      if (!importer || !importer.startsWith(DOCS)) return null;
      if (id.startsWith('.') || id.startsWith('/') || id.startsWith('\0') || id.includes(':')) return null;
      return this.resolve(id, FRONTEND + 'package.json', { ...options, skipSelf: true });
    },
  };
}

// Sitio de documentación del simulador. Los textos viven en docs/ (raíz del repo); la
// configuración está acá para que VitePress resuelva sus paquetes desde frontend/. Se
// publica junto con la aplicación, bajo /docs/: Vite deja el simulador en frontend/dist y
// este el sitio en frontend/dist/docs.
export default defineConfig({
  lang: 'es-AR',
  title: 'Guía del Simulador de Monitores',
  description: 'Documentación del simulador de monitores, desarrollado como PPS en la Facultad de Informática (UNLP).',
  srcDir: '../../docs',
  base: '/docs/',
  outDir: '../dist/docs',
  // Fuera del sitio: documentos privados, material de la catedra, la teoria de monitores y
  // las decisiones de diseño (quedan en docs/ para el nucleo y la PPS). El sitio es una guia
  // de referencia y operacion: explica los conceptos desde lo que muestra el simulador.
  srcExclude: [
    'informe-revision.md', 'verificacion-*.md', 'clases-materia/**', 'pps/**',
    'monitores/**', 'decisiones/**', 'lenguaje/especificacion.md',
  ],
  vite: {
    plugins: [resolverDesdeFrontend()],
    server: { fs: { allow: ['../..'] } },
  },
  cleanUrls: true,
  // rotulos de los cuadros de aviso (::: tip, ::: warning...), que por defecto salen en inglés
  markdown: {
    // los ejemplos se colorean con la gramatica del lenguaje y los colores del editor
    languages: [monitoresLanguage],
    theme: { light: monitoresLight, dark: monitoresDark },
    codeCopyButtonTitle: 'Copiar',
    config(md) {
      md.use(numeroDeSeccion);
      md.use(abrirEnElSimulador);
    },
    container: {
      tipLabel: 'Nota',
      warningLabel: 'Atención',
      dangerLabel: 'Peligro',
      infoLabel: 'Información',
      detailsLabel: 'Detalles',
    },
  },
  // claro u oscuro, como el simulador. VitePress guarda la elección en localStorage, con la
  // clave vitepress-theme-appearance, que el simulador también lee (src/useTheme.ts): elegir
  // el tema en uno lo cambia en el otro.
  appearance: true,
  head: [['link', { rel: 'icon', href: '/docs/favicon.svg' }]],
  themeConfig: {
    // la marca y el nombre de la guia llevan a la portada; el boton "Abrir el simulador"
    // lo agrega el tema, a la derecha
    siteTitle: 'Guía',
    logo: '/favicon.svg',
    sidebar: barraLateral,
    // lo que el tema necesita de la estructura: numeros de seccion, migas, portada
    guia,
    outline: { label: 'En esta página', level: [2, 3] },
    docFooter: { prev: 'Anterior', next: 'Siguiente' },
    returnToTopLabel: 'Volver arriba',
    sidebarMenuLabel: 'Menú',
    darkModeSwitchLabel: 'Apariencia',
    lightModeSwitchTitle: 'Pasar al tema claro',
    darkModeSwitchTitle: 'Pasar al tema oscuro',
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: 'Buscar instrucción, error o concepto', buttonAriaLabel: 'Buscar en la guía' },
          modal: {
            displayDetails: 'Mostrar detalles',
            resetButtonTitle: 'Borrar la búsqueda',
            backButtonTitle: 'Cerrar',
            noResultsText: 'No hay resultados para',
            footer: {
              selectText: 'para seleccionar',
              selectKeyAriaLabel: 'Enter',
              navigateText: 'para navegar',
              navigateUpKeyAriaLabel: 'flecha arriba',
              navigateDownKeyAriaLabel: 'flecha abajo',
              closeText: 'para cerrar',
              closeKeyAriaLabel: 'Escape',
            },
          },
        },
      },
    },
  },
});
