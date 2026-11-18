import { useState } from 'react';

/**
 * Cuantas veces cambio un valor desde que se monto el componente. Sirve para destacar un
 * dato cuando cambia sin destacarlo la primera vez que se dibuja: con 0 no cambio nunca, y
 * usado como `key` reinicia la animacion en cada cambio.
 */
export function useChangeCount(value: unknown): number {
  const [seen, setSeen] = useState({ value, count: 0 });
  // patron de React para derivar estado de una prop: se compara durante el render
  if (!Object.is(seen.value, value)) setSeen({ value, count: seen.count + 1 });
  return Object.is(seen.value, value) ? seen.count : seen.count + 1;
}
