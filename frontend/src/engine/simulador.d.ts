// Tipos del modulo que genera TeaVM a partir de ar.edu.unlp.info.simulador.js.SimuladorJs.
// simulador.js es codigo generado: no se edita a mano, se regenera con `npm run engine` desde
// frontend/ (compila con TeaVM y actualiza simulador.hash). Todas las funciones devuelven
// JSON; api.ts lo parsea y tipa.

/** Compila y arranca una simulacion. seed negativa = la elige el reloj. */
export function crear(code: string, seed: number): string;

/** Reinicia al instante 0 con el mismo codigo y semilla. */
export function reiniciar(): string;

/**
 * Avanza un instante. elegido negativo = decide la politica. ahoraMs es la hora actual
 * (Date.now()): la usa delay, que demora en tiempo real.
 */
export function paso(policy: string, elegido: number, ahoraMs: number): string;

/** Estado actual y los ultimos eventos del log. */
export function estado(): string;

/** Libera la simulacion en curso. */
export function liberar(): void;
