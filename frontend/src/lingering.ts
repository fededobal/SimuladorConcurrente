// Elementos que "se quedan un momento" despues de salir de una lista, para poder animar su
// salida: sin esto, el proceso que deja una cola desaparece de golpe y los demas saltan a
// ocupar su lugar. Aca esta la parte sin DOM; el hook que la usa es `useLingering`.

/** Un elemento que salio de la lista, con el lugar que ocupaba. */
export interface Departed<T> {
  readonly item: T;
  readonly index: number;
}

/** Un elemento a dibujar: de la lista actual, o uno que se esta yendo. */
export interface Lingering<T> {
  readonly item: T;
  readonly leaving: boolean;
  /** Lugar entre los actuales; para el que se va, el que tenia antes de salir. */
  readonly index: number;
}

type KeyOf<T> = (item: T) => string | number;

/** true si las dos listas tienen las mismas claves en el mismo orden. */
export function sameKeys<T>(a: readonly T[], b: readonly T[], keyOf: KeyOf<T>): boolean {
  return a.length === b.length && a.every((item, i) => keyOf(item) === keyOf(b[i]));
}

/** Los elementos de `before` que ya no estan en `after`, con el lugar que tenian. */
export function departedFrom<T>(before: readonly T[], after: readonly T[], keyOf: KeyOf<T>): Departed<T>[] {
  const present = new Set(after.map(keyOf));
  return before
    .map((item, index) => ({ item, index }))
    .filter((d) => !present.has(keyOf(d.item)));
}

/**
 * La lista actual con los que se fueron intercalados en el lugar que tenian. Uno que volvio
 * a entrar no se repite: vale el actual.
 */
export function withDeparted<T>(
  current: readonly T[], departed: readonly Departed<T>[], keyOf: KeyOf<T>,
): Lingering<T>[] {
  const present = new Set(current.map(keyOf));
  const out: Lingering<T>[] = current.map((item, index) => ({ item, leaving: false, index }));
  const gone = departed.filter((d) => !present.has(keyOf(d.item))).sort((a, b) => a.index - b.index);
  // De adelante para atras: el lugar de cada uno es el que tenia en la lista vieja, y al
  // insertar los anteriores primero la lista se va pareciendo a aquella.
  for (const d of gone) {
    out.splice(Math.min(d.index, out.length), 0, { item: d.item, leaving: true, index: d.index });
  }
  return out;
}
