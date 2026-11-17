// Reutilizacion estructural: de dos valores JSON consecutivos (dos estados de la simulacion),
// devuelve el nuevo pero con los objetos del anterior en todo lo que no cambio.
//
// El motor entrega el estado completo en cada paso, como objetos nuevos. Para React eso es
// "cambio todo", y vuelve a dibujar cada monitor y cada proceso aunque no se hayan movido.
// Compartiendo las partes iguales, un componente memorizado que recibe el mismo objeto se
// saltea el dibujado: con mil procesos y uno que avanza, se redibuja uno.

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/**
 * `next`, reutilizando de `prev` cada objeto o arreglo que sea igual en contenido. Si son
 * iguales por completo devuelve `prev` mismo. Pensado para datos JSON (sin ciclos ni clases).
 */
export function reuseUnchanged<T>(prev: T, next: T): T {
  if (Object.is(prev, next)) return prev;

  if (Array.isArray(prev) && Array.isArray(next)) {
    let same = prev.length === next.length;
    const merged = next.map((item: unknown, i: number) => {
      const reused = i < prev.length ? reuseUnchanged(prev[i] as unknown, item) : item;
      if (reused !== prev[i]) same = false;
      return reused;
    });
    return (same ? prev : merged) as T;
  }

  if (isPlainObject(prev) && isPlainObject(next)) {
    const keys = Object.keys(next);
    let same = keys.length === Object.keys(prev).length;
    const merged: Record<string, unknown> = {};
    for (const key of keys) {
      const reused = key in prev ? reuseUnchanged(prev[key], next[key]) : next[key];
      if (reused !== prev[key]) same = false;
      merged[key] = reused;
    }
    return (same ? prev : merged) as T;
  }

  return next;
}
