// Constantes del programa: las lineas "#define N 5" del principio. No son variables, son
// ajustes del compilador: el nucleo reemplaza cada nombre por su numero antes de compilar.
// Este modulo las lee y las reescribe en el texto, para el menu Constantes del editor; el
// programa sigue siendo un solo texto, que es lo que se guarda, se descarga y se comparte.

import { KEYWORDS } from './editor/highlight';

/** Una constante del programa. */
export interface ProgramConstant {
  readonly name: string;
  /** El valor como se escribe: un entero sin signo. */
  readonly value: string;
  /** Comentario al final de la linea ("// cantidad de clientes"), si lo tiene. */
  readonly comment?: string;
}

/** Una linea "#define NOMBRE valor", con un comentario opcional al final. */
const DEFINE_LINE = /^[ \t]*#define[ \t]+([\p{L}_][\p{L}\p{N}_]*)[ \t]+(\d+)[ \t]*(\/\/.*)?$/iu;
/** Una linea que empieza con #define, este bien escrita o no. */
const ANY_DEFINE = /^[ \t]*#define\b/i;
const NAME = /^[\p{L}_][\p{L}\p{N}_]*$/u;
const VALUE = /^\d+$/;

/** Nombres que se proponen para una constante nueva, en este orden. */
const SUGGESTED_NAMES = ['N', 'M', 'P', 'C', 'K', 'L'];

/** Las constantes bien escritas del programa, en el orden en que aparecen. */
export function readConstants(code: string): ProgramConstant[] {
  const constants: ProgramConstant[] = [];
  for (const line of code.split('\n')) {
    const m = DEFINE_LINE.exec(line.replace(/\r$/, ''));
    if (m) constants.push({ name: m[1], value: m[2], ...(m[3] ? { comment: m[3] } : {}) });
  }
  return constants;
}

/**
 * El programa con estas constantes en lugar de las que tenia. Las lineas nuevas van donde
 * estaba la primera constante; si no habia ninguna, despues de los comentarios del
 * encabezado, que es donde el compilador las acepta: antes de monitores y procesos.
 */
export function writeConstants(code: string, constants: readonly ProgramConstant[]): string {
  const lines = code.split('\n');
  const first = lines.findIndex((l) => ANY_DEFINE.test(l));
  const rest = lines.filter((l) => !ANY_DEFINE.test(l));
  const defines = constants.map((c) => `#define ${c.name} ${c.value}${c.comment ? `  ${c.comment}` : ''}`);

  let at = first;
  if (at < 0) {
    at = 0;
    while (at < rest.length && rest[at].trimStart().startsWith('//')) at++;
    // separadas del codigo por una linea en blanco
    if (defines.length > 0 && at < rest.length && rest[at].trim() !== '') defines.push('');
  }
  return [...rest.slice(0, at), ...defines, ...rest.slice(at)].join('\n');
}

/**
 * Por que no se puede usar ese nombre para una constante, o null si se puede.
 *
 * @param others los nombres de las demas constantes
 */
export function constantNameError(name: string, others: readonly string[]): string | null {
  if (name === '') return 'Falta el nombre';
  if (!NAME.test(name)) return 'El nombre lleva letras, dígitos y _, y no empieza con un dígito';
  const lower = name.toLowerCase();
  if (Object.hasOwn(KEYWORDS, lower) || lower === 'boolean') return `${name} es una palabra reservada`;
  if (others.includes(name)) return `Ya hay una constante ${name}`;
  return null;
}

/** Por que ese valor no sirve, o null si sirve: tiene que ser un entero sin signo. */
export function constantValueError(value: string): string | null {
  return VALUE.test(value) ? null : 'El valor es un número entero, sin signo';
}

/** El primer nombre sugerido que no esta en uso: N, M, P... */
export function nextConstantName(used: readonly string[]): string {
  const free = SUGGESTED_NAMES.find((n) => !used.includes(n));
  if (free) return free;
  let i = 1;
  while (used.includes(`N${i}`)) i++;
  return `N${i}`;
}
