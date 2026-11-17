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
  // claro u oscuro, como el simulador. VitePress guarda la elección en localStorage, con la
  // clave vitepress-theme-appearance, que el simulador también lee (src/useTheme.ts): elegir
  // el tema en uno lo cambia en el otro.
  appearance: true,
  head: [['link', { rel: 'icon', href: '/docs/favicon.svg' }]],
  themeConfig: {
    // sin titulo en la barra: a la izquierda va solo el boton "Volver al simulador"
    siteTitle: false,
    sidebar: [
      {
        text: 'Introducción',
        items: [
          { text: 'Presentación', link: '/' },
          { text: 'Primer programa', link: '/introduccion/primer-programa' },
          { text: 'Notación de la cátedra', link: '/introduccion/notacion-de-la-catedra' },
        ],
      },
      {
        text: 'Lenguaje',
        items: [
          { text: 'Estructura del programa', link: '/lenguaje/' },
          { text: 'Tipos y arreglos', link: '/lenguaje/tipos' },
          { text: 'Colas', link: '/lenguaje/colas' },
          { text: 'Monitores', link: '/lenguaje/monitores' },
          { text: 'Procesos', link: '/lenguaje/procesos' },
          { text: 'Expresiones', link: '/lenguaje/expresiones' },
          { text: 'Alcance de los nombres', link: '/lenguaje/alcance' },
          { text: 'Palabras reservadas', link: '/lenguaje/palabras-reservadas' },
          {
            text: 'Instrucciones',
            link: '/lenguaje/instrucciones/',
            collapsed: true,
            items: [
              { text: 'Asignación', link: '/lenguaje/instrucciones/asignacion' },
              { text: 'Intercambio :=:', link: '/lenguaje/instrucciones/intercambio' },
              { text: 'Llamada a monitor', link: '/lenguaje/instrucciones/llamada' },
              { text: 'if', link: '/lenguaje/instrucciones/if' },
              { text: 'while', link: '/lenguaje/instrucciones/while' },
              { text: 'for', link: '/lenguaje/instrucciones/for' },
              { text: 'skip', link: '/lenguaje/instrucciones/skip' },
              { text: 'wait', link: '/lenguaje/instrucciones/wait' },
              { text: 'signal', link: '/lenguaje/instrucciones/signal' },
              { text: 'signal_all', link: '/lenguaje/instrucciones/signal-all' },
              { text: 'push', link: '/lenguaje/instrucciones/push' },
              { text: 'pop', link: '/lenguaje/instrucciones/pop' },
              { text: 'empty', link: '/lenguaje/instrucciones/empty' },
              { text: 'write', link: '/lenguaje/instrucciones/write' },
              { text: 'delay', link: '/lenguaje/instrucciones/delay' },
            ],
          },
        ],
      },
      {
        text: 'Ejecución',
        items: [
          { text: 'Instantes y turnos', link: '/ejecucion/instantes-y-turnos' },
          { text: 'Estados de un proceso', link: '/ejecucion/estados' },
          { text: 'Acceso al monitor', link: '/ejecucion/acceso-al-monitor' },
          { text: 'Variables condición', link: '/ejecucion/variables-condicion' },
          { text: 'Finalización', link: '/ejecucion/finalizacion' },
        ],
      },
      {
        text: 'Interfaz',
        items: [
          { text: 'Disposición de la pantalla', link: '/interfaz/' },
          { text: 'Barra de controles', link: '/interfaz/barra' },
          { text: 'Editor', link: '/interfaz/editor' },
          { text: 'Panel de monitores', link: '/interfaz/monitores' },
          { text: 'Línea de tiempo', link: '/interfaz/linea-de-tiempo' },
          { text: 'Salida', link: '/interfaz/salida' },
        ],
      },
      {
        text: 'Operación',
        items: [
          { text: 'Ejecución paso a paso', link: '/operacion/paso-a-paso' },
          { text: 'Comparación de ejecuciones', link: '/operacion/comparar-ejecuciones' },
          { text: 'Diagnóstico de un interbloqueo', link: '/operacion/interbloqueo' },
          { text: 'Inspección de un monitor', link: '/operacion/inspeccion-de-monitores' },
        ],
      },
      {
        text: 'Solución de problemas',
        items: [
          { text: 'Errores de compilación', link: '/problemas/errores-de-compilacion' },
          { text: 'Errores en tiempo de ejecución', link: '/problemas/errores-en-tiempo-de-ejecucion' },
          { text: 'El programa se detiene', link: '/problemas/el-programa-se-detiene' },
          { text: 'Resultados que varían', link: '/problemas/resultados-que-varian' },
        ],
      },
      {
        text: 'Referencia',
        items: [
          { text: 'Límites', link: '/referencia/limites' },
          { text: 'Atajos de teclado', link: '/referencia/atajos' },
          { text: 'Glosario', link: '/referencia/glosario' },
          { text: 'Programas de ejemplo', link: '/referencia/ejemplos' },
        ],
      },
    ],
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
