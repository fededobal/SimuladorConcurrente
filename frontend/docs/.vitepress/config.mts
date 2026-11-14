import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitepress';
import type { Plugin } from 'vite';

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
  title: 'Simulador de Monitores',
  description: 'Documentación del simulador de monitores de Programación Concurrente (UNLP).',
  srcDir: '../../docs',
  base: '/docs/',
  outDir: '../dist/docs',
  // documentos privados y material de la cátedra que no forman parte del sitio
  // Fuera del sitio: documentos privados, material de la catedra, la teoria de monitores y
  // las decisiones de diseño (quedan en docs/ para el nucleo y la PPS; el sitio es solo de uso)
  srcExclude: [
    'informe-revision.md', 'verificacion-*.md', 'clases-materia/**', 'pps/**',
    'monitores/**', 'decisiones/**',
  ],
  vite: {
    plugins: [resolverDesdeFrontend()],
    server: { fs: { allow: ['../..'] } },
  },
  cleanUrls: true,
  lastUpdated: true,
  // el simulador es solo claro; la documentación también
  appearance: false,
  head: [['link', { rel: 'icon', href: '/docs/favicon.svg' }]],
  themeConfig: {
    // sin titulo en la barra: a la izquierda va solo el boton "Volver al simulador"
    siteTitle: false,
    sidebar: [
      {
        text: 'Introducción',
        items: [
          { text: '¿Qué es el simulador?', link: '/' },
        ],
      },
      {
        text: 'Simulador',
        items: [
          { text: 'La pantalla', link: '/simulador/' },
          { text: 'Barra de controles', link: '/simulador/barra' },
          { text: 'Editor', link: '/simulador/editor' },
          { text: 'Línea de tiempo', link: '/simulador/linea-de-tiempo' },
          { text: 'Monitores', link: '/simulador/monitores' },
          { text: 'Salida', link: '/simulador/salida' },
          { text: 'Ejecución', link: '/simulador/ejecucion' },
        ],
      },
      {
        text: 'Lenguaje',
        items: [
          { text: 'Estructura del programa', link: '/lenguaje/' },
          { text: 'Palabras reservadas', link: '/lenguaje/palabras-reservadas' },
          { text: 'Tipos y arreglos', link: '/lenguaje/tipos' },
          { text: 'Colas', link: '/lenguaje/colas' },
          { text: 'Monitores', link: '/lenguaje/monitores' },
          { text: 'Procesos', link: '/lenguaje/procesos' },
          { text: 'Sentencias', link: '/lenguaje/sentencias' },
          {
            text: 'Instrucciones',
            collapsed: true,
            items: [
              { text: 'if y while', link: '/lenguaje/instrucciones/if-while' },
              { text: 'for', link: '/lenguaje/instrucciones/for' },
              { text: 'wait, signal y signal_all', link: '/lenguaje/instrucciones/wait-signal' },
              { text: 'push, pop y empty', link: '/lenguaje/instrucciones/push-pop' },
              { text: 'write', link: '/lenguaje/instrucciones/write' },
              { text: 'delay', link: '/lenguaje/instrucciones/delay' },
            ],
          },
          { text: 'Expresiones', link: '/lenguaje/expresiones' },
          { text: 'Alcance de los nombres', link: '/lenguaje/alcance' },
          { text: 'Qué avisa el compilador', link: '/lenguaje/errores' },
          { text: 'Qué no existe', link: '/lenguaje/no-existe' },
          { text: 'Ejemplo completo', link: '/lenguaje/ejemplo-completo' },
          { text: 'Especificación (EBNF)', link: '/lenguaje/especificacion' },
        ],
      },
      {
        text: 'Ejemplos',
        items: [
          { text: 'Programas de ejemplo', link: '/ejemplos' },
        ],
      },
    ],
    outline: { label: 'En esta página', level: [2, 3] },
    docFooter: { prev: 'Anterior', next: 'Siguiente' },
    lastUpdatedText: 'Última actualización',
    returnToTopLabel: 'Volver arriba',
    sidebarMenuLabel: 'Menú',
    darkModeSwitchLabel: 'Apariencia',
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: 'Buscar', buttonAriaLabel: 'Buscar en la documentación' },
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
