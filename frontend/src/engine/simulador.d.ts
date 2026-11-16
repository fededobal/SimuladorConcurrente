// Tipos del modulo que genera TeaVM a partir de ar.edu.unlp.info.simulador.js.SimulatorJs.
// simulador.js es codigo generado: no se edita a mano, se regenera con `npm run engine` desde
// frontend/ (compila con TeaVM y actualiza simulador.hash). Todas las funciones devuelven
// JSON; api.ts lo parsea y tipa.

/** Compila y arranca una simulacion. seed negativa = la elige el reloj. */
export function create(code: string, seed: number): string;

/** Reinicia al instante 0 con el mismo codigo y semilla. */
export function restart(): string;

/**
 * Avanza un instante. chosenProcessId negativo = decide la politica. nowMs es la hora actual
 * (Date.now()): la usa delay, que demora en tiempo real.
 */
export function step(policy: string, chosenProcessId: number, nowMs: number): string;

/** Estado actual y los ultimos eventos del log. */
export function state(): string;

/** Libera la simulacion en curso. */
export function release(): void;
