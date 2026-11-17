import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { DefaultTheme } from 'vitepress';
import * as motor from '../../src/engine/simulador.js';

// Estructura de la guia: capitulos numerados, como un libro. De esta tabla salen la barra
// lateral, el numero de seccion de cada pagina (titulo, migas, anterior y siguiente) y las
// tarjetas de la portada. Agregar una pagina es agregarla aca: el numero se calcula solo.

/** Una pagina de un capitulo; con `paginas`, es un grupo con paginas adentro (2.9.x). */
interface PaginaDef {
  readonly titulo: string;
  readonly enlace: string;
  readonly paginas?: readonly PaginaDef[];
}

interface CapituloDef {
  readonly titulo: string;
  /** Que cubre el capitulo, para su tarjeta de la portada. */
  readonly descripcion: string;
  readonly paginas: readonly PaginaDef[];
}

const CAPITULOS: readonly CapituloDef[] = [
  {
    titulo: 'Introducción',
    descripcion: 'Qué es el simulador, un primer recorrido y cómo se escribe la notación de las clases.',
    paginas: [
      { titulo: 'Presentación', enlace: '/introduccion/presentacion' },
      { titulo: 'Primer programa', enlace: '/introduccion/primer-programa' },
      { titulo: 'Notación de la cátedra', enlace: '/introduccion/notacion-de-la-catedra' },
    ],
  },
  {
    titulo: 'Lenguaje',
    descripcion: 'Qué se puede escribir: estructura, tipos, monitores, procesos y una página por instrucción.',
    paginas: [
      { titulo: 'Estructura del programa', enlace: '/lenguaje/' },
      { titulo: 'Tipos y arreglos', enlace: '/lenguaje/tipos' },
      { titulo: 'Colas', enlace: '/lenguaje/colas' },
      { titulo: 'Monitores', enlace: '/lenguaje/monitores' },
      { titulo: 'Procesos', enlace: '/lenguaje/procesos' },
      { titulo: 'Expresiones', enlace: '/lenguaje/expresiones' },
      { titulo: 'Alcance de los nombres', enlace: '/lenguaje/alcance' },
      { titulo: 'Palabras reservadas', enlace: '/lenguaje/palabras-reservadas' },
      {
        titulo: 'Instrucciones',
        enlace: '/lenguaje/instrucciones/',
        paginas: [
          { titulo: 'Asignación', enlace: '/lenguaje/instrucciones/asignacion' },
          { titulo: 'Intercambio :=:', enlace: '/lenguaje/instrucciones/intercambio' },
          { titulo: 'Llamada a monitor', enlace: '/lenguaje/instrucciones/llamada' },
          { titulo: 'if', enlace: '/lenguaje/instrucciones/if' },
          { titulo: 'while', enlace: '/lenguaje/instrucciones/while' },
          { titulo: 'for', enlace: '/lenguaje/instrucciones/for' },
          { titulo: 'skip', enlace: '/lenguaje/instrucciones/skip' },
          { titulo: 'wait', enlace: '/lenguaje/instrucciones/wait' },
          { titulo: 'signal', enlace: '/lenguaje/instrucciones/signal' },
          { titulo: 'signal_all', enlace: '/lenguaje/instrucciones/signal-all' },
          { titulo: 'push', enlace: '/lenguaje/instrucciones/push' },
          { titulo: 'pop', enlace: '/lenguaje/instrucciones/pop' },
          { titulo: 'empty', enlace: '/lenguaje/instrucciones/empty' },
          { titulo: 'write', enlace: '/lenguaje/instrucciones/write' },
          { titulo: 'delay', enlace: '/lenguaje/instrucciones/delay' },
        ],
      },
    ],
  },
  {
    titulo: 'Ejecución',
    descripcion: 'Cómo avanza un programa: instantes, estados, acceso al monitor y variables condición.',
    paginas: [
      { titulo: 'Instantes y turnos', enlace: '/ejecucion/instantes-y-turnos' },
      { titulo: 'Estados de un proceso', enlace: '/ejecucion/estados' },
      { titulo: 'Acceso al monitor', enlace: '/ejecucion/acceso-al-monitor' },
      { titulo: 'Variables condición', enlace: '/ejecucion/variables-condicion' },
      { titulo: 'Finalización', enlace: '/ejecucion/finalizacion' },
    ],
  },
  {
    titulo: 'Interfaz',
    descripcion: 'Qué muestra cada zona de la pantalla y cómo se usa.',
    paginas: [
      { titulo: 'Disposición de la pantalla', enlace: '/interfaz/' },
      { titulo: 'Barra de controles', enlace: '/interfaz/barra' },
      { titulo: 'Editor', enlace: '/interfaz/editor' },
      { titulo: 'Panel de monitores', enlace: '/interfaz/monitores' },
      { titulo: 'Procesos y salida', enlace: '/interfaz/salida' },
      { titulo: 'Línea de tiempo', enlace: '/interfaz/linea-de-tiempo' },
      { titulo: 'Programas y archivos', enlace: '/interfaz/programas' },
    ],
  },
  {
    titulo: 'Operación',
    descripcion: 'Procedimientos paso a paso para seguir, comparar y diagnosticar una ejecución.',
    paginas: [
      { titulo: 'Ejecución paso a paso', enlace: '/operacion/paso-a-paso' },
      { titulo: 'Comparación de ejecuciones', enlace: '/operacion/comparar-ejecuciones' },
      { titulo: 'Diagnóstico de un interbloqueo', enlace: '/operacion/interbloqueo' },
      { titulo: 'Inspección de un monitor', enlace: '/operacion/inspeccion-de-monitores' },
    ],
  },
  {
    titulo: 'Solución de problemas',
    descripcion: 'Qué significa cada error y qué hacer cuando el programa se detiene.',
    paginas: [
      { titulo: 'Errores de compilación', enlace: '/problemas/errores-de-compilacion' },
      { titulo: 'Errores en tiempo de ejecución', enlace: '/problemas/errores-en-tiempo-de-ejecucion' },
      { titulo: 'El programa se detiene', enlace: '/problemas/el-programa-se-detiene' },
      { titulo: 'Resultados que varían', enlace: '/problemas/resultados-que-varian' },
    ],
  },
  {
    titulo: 'Referencia',
    descripcion: 'Límites, atajos de teclado, glosario y programas de ejemplo.',
    paginas: [
      { titulo: 'Límites', enlace: '/referencia/limites' },
      { titulo: 'Atajos de teclado', enlace: '/referencia/atajos' },
      { titulo: 'Glosario', enlace: '/referencia/glosario' },
      { titulo: 'Programas de ejemplo', enlace: '/referencia/ejemplos' },
    ],
  },
];

/** Un eslabon de las migas: capitulo, grupo o pagina. */
export interface Eslabon {
  readonly numero: string;
  readonly titulo: string;
  readonly enlace: string;
}

/** Lo que el tema sabe de una pagina: su numero y el camino desde la portada. */
export interface PaginaGuia extends Eslabon {
  /** Capitulo y, si corresponde, grupo que la contienen (sin la pagina misma). */
  readonly camino: readonly Eslabon[];
}

/** Tarjeta de un capitulo en la portada. */
export interface CapituloGuia extends Eslabon {
  readonly descripcion: string;
  /** Paginas de primer nivel del capitulo. */
  readonly paginas: readonly Eslabon[];
}

/** Programa del menu Ejemplos, para abrirlo en el simulador desde la guia. */
export interface EjemploGuia {
  readonly id: string;
  readonly titulo: string;
}

/** Lo que la configuracion le pasa al tema (queda en `themeConfig.guia`). */
export interface Guia {
  readonly capitulos: readonly CapituloGuia[];
  /** Todas las paginas numeradas, por enlace. */
  readonly paginas: Readonly<Record<string, PaginaGuia>>;
  readonly instrucciones: readonly Eslabon[];
  readonly ejemplos: readonly EjemploGuia[];
  readonly totalPaginas: number;
}

function rotulo(numero: string, titulo: string): string {
  return `<span class="num">${numero}</span> ${titulo}`;
}

const paginas: Record<string, PaginaGuia> = {};

function registrar(def: PaginaDef, numero: string, camino: readonly Eslabon[]): Eslabon {
  const eslabon = { numero, titulo: def.titulo, enlace: def.enlace };
  paginas[def.enlace] = { ...eslabon, camino };
  def.paginas?.forEach((hija, i) => registrar(hija, `${numero}.${i + 1}`, [...camino, eslabon]));
  return eslabon;
}

const capitulos: CapituloGuia[] = CAPITULOS.map((cap, i) => {
  const numero = String(i + 1);
  const eslabon = { numero, titulo: cap.titulo, enlace: cap.paginas[0].enlace };
  return {
    ...eslabon,
    descripcion: cap.descripcion,
    paginas: cap.paginas.map((p, j) => registrar(p, `${numero}.${j + 1}`, [eslabon])),
  };
});

/** La barra lateral: un grupo plegable por capitulo, con el numero delante de cada titulo. */
export const barraLateral: DefaultTheme.SidebarItem[] = CAPITULOS.map((cap, i) => ({
  text: rotulo(String(i + 1), cap.titulo),
  collapsed: true,
  items: cap.paginas.map((p, j): DefaultTheme.SidebarItem => {
    const numero = `${i + 1}.${j + 1}`;
    return {
      text: rotulo(numero, p.titulo),
      link: p.enlace,
      ...(p.paginas && {
        collapsed: true,
        items: p.paginas.map((h, k) => ({ text: rotulo(`${numero}.${k + 1}`, h.titulo), link: h.enlace })),
      }),
    };
  }),
}));

// ------------------------------------------------------------------ ejemplos

const DIR_EJEMPLOS = fileURLToPath(new URL('../../../ejemplos/', import.meta.url));

/** La linea "// espera: ..." que leen los tests; al alumno no le sirve (ver src/ejemplos.ts). */
const ESPERA = /^\/\/\s*espera:.*\n?/m;

interface EjemploFuente extends EjemploGuia {
  /** El programa sin comentarios de encabezado ni espacios al final, para compararlo. */
  readonly normal: string;
}

/** Un programa sin sus comentarios de encabezado ni lineas en blanco al principio o al final. */
function normalizar(codigo: string): string {
  return codigo.replace(/\r\n?/g, '\n').replace(/^(\s*\/\/.*\n|\s*\n)+/, '').trimEnd();
}

const ejemplos: EjemploFuente[] = readdirSync(DIR_EJEMPLOS)
  .filter((f) => f.endsWith('.mon'))
  .sort()
  .map((archivo) => {
    const texto = readFileSync(DIR_EJEMPLOS + archivo, 'utf8');
    return {
      id: archivo.replace(/\.mon$/, ''),
      titulo: texto.split('\n')[0].replace(/^\/\/\s*/, ''),
      normal: normalizar(texto.replace(ESPERA, '')),
    };
  });

/** El ejemplo del menu que tiene ese id, o undefined. */
export function ejemploPorId(id: string): EjemploGuia | undefined {
  return ejemplos.find((e) => e.id === id);
}

/** El ejemplo del menu cuyo programa es este mismo codigo, o undefined. */
export function ejemploIgualA(codigo: string): EjemploGuia | undefined {
  const normal = normalizar(codigo);
  return ejemplos.find((e) => e.normal === normal);
}

/**
 * true si el codigo es un programa completo que el simulador acepta. Se compila con el motor
 * real: asi "Abrir en el simulador" se ofrece solo donde abre algo que funciona, y nunca en
 * un fragmento (un procedure suelto, una linea de sintaxis).
 */
export function esProgramaCompleto(codigo: string): boolean {
  try {
    const respuesta = JSON.parse(motor.create(codigo, 1)) as { error?: string };
    motor.release();
    return respuesta.error === undefined;
  } catch {
    return false;
  }
}

/** Fragmento de direccion que abre un programa en el simulador (igual a src/shareLink.ts). */
export function fragmentoPara(nombre: string, codigo: string): string {
  const base64 = Buffer.from(codigo, 'utf8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${new URLSearchParams({ nombre })}&codigo=${base64}`;
}

const grupoInstrucciones = paginas['/lenguaje/instrucciones/'];

export const guia: Guia = {
  capitulos,
  paginas,
  instrucciones: Object.values(paginas).filter((p) => p.camino.some((e) => e.enlace === grupoInstrucciones.enlace)),
  ejemplos: ejemplos.map(({ id, titulo }) => ({ id, titulo })),
  totalPaginas: Object.keys(paginas).length,
};
