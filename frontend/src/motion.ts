// Movimiento entre un instante y el siguiente: cuanto dura y con que curva. Lo comparten el
// editor (franjas, chips y etiquetas) y la linea de tiempo (tramos, cursor y desplazamiento),
// para que todo lo que se mueve en un paso lo haga a la vez.

/** Tope del deslizamiento, en ms: mas largo, la pantalla sigue moviendose con el paso ya dado. */
const MAX_SLIDE_MS = 320;
/** Parte de la duracion del instante que ocupa el deslizamiento. */
const SLIDE_SHARE = 0.6;

/**
 * Duracion del deslizamiento para un instante que dura `stepMs`. No ocupa el instante
 * entero: lo que se mueve llega y se queda quieto un momento antes del paso siguiente, asi
 * se alcanza a leer donde quedo cada proceso.
 */
export function slideMs(stepMs: number): number {
  return Math.min(Math.round(stepMs * SLIDE_SHARE), MAX_SLIDE_MS);
}

/** Puntos de control de la curva del deslizamiento; los mismos que `--ease-step` en index.css. */
export const STEP_EASING = [0.4, 0, 0.2, 1] as const;

/**
 * Curva cubic-bezier como funcion del avance (0 a 1), igual a la de CSS. La usa el
 * desplazamiento de la linea de tiempo, que se anima a mano, para ir al compas de las
 * transiciones de CSS.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const at = (a: number, b: number, u: number) => {
    const v = 1 - u;
    return 3 * v * v * u * a + 3 * v * u * u * b + u * u * u;
  };
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    // se busca por biseccion el parametro u cuyo x es t; x crece con u
    let low = 0;
    let high = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (low + high) / 2;
      if (at(x1, x2, mid) < t) low = mid;
      else high = mid;
    }
    return at(y1, y2, (low + high) / 2);
  };
}

/** La curva del deslizamiento, como funcion. */
export const stepEasing = cubicBezier(...STEP_EASING);

/** true si el sistema pide reducir el movimiento: no se anima nada. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}
