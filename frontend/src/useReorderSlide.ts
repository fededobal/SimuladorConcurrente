import { useLayoutEffect, useRef } from 'react';
import { prefersReducedMotion } from './motion';

/**
 * Para una lista cuyos elementos cambian de orden entre un instante y el siguiente: cada
 * hijo que cambio de lugar se desliza desde donde estaba, en vez de aparecer de golpe en el
 * lugar nuevo. Cada hijo directo del contenedor lleva su clave en `data-key`.
 *
 * La duracion y la curva son las del resto del movimiento del instante (`--desliz` y
 * `--ease-step`, que fija el inspector segun la velocidad).
 *
 * @param order las claves en el orden en que se dibujan
 * @returns la referencia para el contenedor de la lista
 */
export function useReorderSlide(order: readonly string[]): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);
  const tops = useRef<ReadonlyMap<string, number>>(new Map());
  const drawn = useRef<string | null>(null);
  const orderKey = order.join('\n');

  // Sin dependencias a proposito: el lugar de cada hijo se mide en cada dibujo, porque las
  // tarjetas cambian de alto aunque el orden no cambie, y la comparacion tiene que ser con
  // el dibujo anterior.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const children = Array.from(el.children).filter((c): c is HTMLElement => c instanceof HTMLElement);
    // offsetTop no cuenta el transform de una animacion en curso: es el lugar definitivo
    const now = new Map(children.map((c) => [c.dataset.key ?? '', c.offsetTop]));
    if (drawn.current !== null && drawn.current !== orderKey && !prefersReducedMotion()) {
      const style = getComputedStyle(el);
      const duration = parseFloat(style.getPropertyValue('--desliz')) || 150;
      const easing = style.getPropertyValue('--ease-step').trim() || 'ease';
      for (const child of children) {
        const before = tops.current.get(child.dataset.key ?? '');
        const after = child.offsetTop;
        if (before !== undefined && before !== after) {
          child.animate([{ transform: `translateY(${before - after}px)` }, { transform: 'none' }],
            { duration, easing });
        }
      }
    }
    drawn.current = orderKey;
    tops.current = now;
  });
  return ref;
}
