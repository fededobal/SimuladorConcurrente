import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitepress';

/** Ruta absoluta de un paquete de frontend/node_modules: los .md estan fuera y no lo verian. */
const pkg = (name: string) => fileURLToPath(import.meta.resolve(name));

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
  srcExclude: ['informe-revision.md', 'verificacion-*.md', 'clases-materia/**', 'pps/**'],
  // VitePress toma srcDir como raiz de Vite y los .md estan fuera de frontend/: vue, que
  // es lo que importan, se fija por ruta absoluta (vitepress ya se resuelve solo)
  vite: {
    resolve: {
      alias: [
        { find: /^vue$/, replacement: pkg('vue') },
        { find: /^vue\/server-renderer$/, replacement: pkg('vue/server-renderer') },
      ],
    },
    server: { fs: { allow: ['../..'] } },
  },
  cleanUrls: true,
  lastUpdated: true,
  // el simulador es solo claro; la documentación también
  appearance: false,
  head: [['link', { rel: 'icon', href: '/docs/favicon.svg' }]],
  themeConfig: {
    siteTitle: 'Simulador de Monitores',
    sidebar: [
      {
        text: 'Introducción',
        items: [
          { text: '¿Qué es el simulador?', link: '/' },
        ],
      },
      {
        text: 'Monitores',
        items: [
          { text: 'Qué es un monitor', link: '/monitores/' },
          { text: 'Variables condición', link: '/monitores/variables-condicion' },
          { text: 'Llamadas entre monitores', link: '/monitores/llamadas-entre-monitores' },
          { text: 'Diferencia con los semáforos', link: '/monitores/semaforos' },
          { text: 'Ejemplos canónicos', link: '/monitores/ejemplos-canonicos' },
          { text: 'Técnicas e interbloqueo', link: '/monitores/tecnicas' },
          { text: 'Conceptos previos', link: '/monitores/conceptos-previos' },
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
        text: 'Simulador',
        items: [
          { text: 'La pantalla', link: '/simulador/' },
        ],
      },
      {
        text: 'Referencia',
        items: [
          { text: 'Programas de ejemplo', link: '/referencia/ejemplos' },
          { text: 'Notas de versión', link: '/referencia/notas-de-version' },
          {
            text: 'Decisiones de diseño',
            collapsed: true,
            items: [
              { text: '0001. Motor en el navegador', link: '/decisiones/0001-motor-en-el-navegador' },
              { text: '0002. Núcleo extensible', link: '/decisiones/0002-nucleo-extensible-por-conceptos' },
              { text: '0003. Alcance: solo monitores', link: '/decisiones/0003-alcance-solo-monitores' },
              { text: '0004. Llamadas abiertas', link: '/decisiones/0004-llamadas-abiertas-entre-monitores' },
              { text: '0005. Traspaso del monitor', link: '/decisiones/0005-traspaso-del-monitor-a-la-cola-de-entrada' },
              { text: '0006. Entrada sin orden de llegada', link: '/decisiones/0006-entrada-al-monitor-sin-orden-de-llegada' },
              { text: '0007. Llamadas cerradas', link: '/decisiones/0007-llamadas-cerradas-entre-monitores' },
            ],
          },
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
