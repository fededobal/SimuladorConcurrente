import { useEffect, useState } from 'react';
import { departedFrom, sameKeys, withDeparted, type Departed, type Lingering } from './lingering';

/** Cuanto se queda en pantalla un elemento que salio de la lista, en ms. */
export const LINGER_MS = 260;

/**
 * La lista con los elementos que acaban de salir todavia adentro, marcados como "se va",
 * durante {@link LINGER_MS}: el componente los dibuja con una animacion de salida y los
 * demas se acomodan sin saltar.
 *
 * @param keyOf clave estable de cada elemento (el id de un proceso)
 */
export function useLingering<T>(items: readonly T[], keyOf: (item: T) => string | number): Lingering<T>[] {
  const [seen, setSeen] = useState(items);
  const [departed, setDeparted] = useState<readonly Departed<T>[]>([]);
  // Se compara por claves y no por identidad: quien llama puede armar el arreglo en cada
  // render, y con identidad esto se volveria a disparar siempre.
  if (!sameKeys(seen, items, keyOf)) {
    setSeen(items);
    const present = new Set(items.map(keyOf));
    setDeparted([
      ...departed.filter((d) => !present.has(keyOf(d.item))),
      ...departedFrom(seen, items, keyOf),
    ]);
  }
  useEffect(() => {
    if (departed.length === 0) return undefined;
    const timer = window.setTimeout(() => setDeparted([]), LINGER_MS);
    return () => window.clearTimeout(timer);
  }, [departed]);
  return withDeparted(items, departed, keyOf);
}
