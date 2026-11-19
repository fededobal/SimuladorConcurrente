import { readConstants, writeConstants } from './constants';
import type { Program } from './programs';

// El programa abierto se guarda en el navegador. Si era un ejemplo y despues el ejemplo
// cambio, quien lo tenia abierto seguia viendo la version vieja hasta volver a elegirlo en
// el menu: asi siguio apareciendo el deadlock del banco despues de corregido. Aca se
// reconoce esa copia vieja y se la reemplaza por el ejemplo actual.

/** Un ejemplo del menu, o una version anterior de uno. */
interface ExampleText {
  readonly id: string;
  readonly codigo: string;
}

/** Una linea "#define NOMBRE valor", con lo que venga despues. */
const DEFINE = /^([ \t]*#define[ \t]+[\p{L}_][\p{L}\p{N}_]*)\b.*$/iu;

/**
 * El programa sin lo que no lo distingue de otro: el valor de las constantes (se cambian
 * desde el menu Constantes sin "editar" el programa), los espacios al final de cada linea y
 * las lineas en blanco del final.
 */
function normalize(code: string): string {
  return code.split('\n')
    .map((line) => line.replace(/\r$/, '').replace(DEFINE, '$1').trimEnd())
    .join('\n')
    .trimEnd();
}

/**
 * Si el programa abierto es la copia sin tocar de una version anterior de un ejemplo, el
 * ejemplo actual con los valores de las constantes que tenia esa copia; null si no lo es.
 * Un programa de "Mis programas" nunca se reemplaza: es un archivo del alumno.
 *
 * @param previous versiones anteriores de los ejemplos
 * @param examples los ejemplos actuales
 */
export function updatedExample(
  program: Program, previous: readonly ExampleText[], examples: readonly ExampleText[],
): Program | null {
  if (program.id !== null) return null;
  const mine = normalize(program.code);
  const old = previous.find((p) => normalize(p.codigo) === mine);
  const current = old && examples.find((e) => e.id === old.id);
  if (!current) return null;

  // las constantes que el alumno habia cambiado siguen con su valor, si el ejemplo las conserva
  const chosen = new Map(readConstants(program.code).map((c) => [c.name, c.value]));
  const constants = readConstants(current.codigo)
    .map((c) => ({ ...c, value: chosen.get(c.name) ?? c.value }));
  return { id: null, name: program.name, code: writeConstants(current.codigo, constants) };
}
