import { crear, liberar, paso, reiniciar } from './engine/simulador.js';
import type {
  ApiError,
  SchedulingPolicy,
  SimulationCreated,
  StepResponse,
} from './types';

// El nucleo (lexer, parser, validador y VM de monitores) esta escrito en Java y vive en
// backend/src/main/java. TeaVM lo compila a engine/simulador.js, asi que corre entero
// dentro del navegador: no hay servidor, ni red, ni latencia. La API REST de Spring sigue
// existiendo y expone el mismo nucleo, pero el frontend ya no la necesita.

export class ApiRequestError extends Error {
  line: number | null;
  constructor(message: string, line: number | null) {
    super(message);
    this.line = line;
  }
}

/** El puente devuelve o el DTO pedido o un ApiError; los distingue el campo `error`. */
function parse<T>(json: string): T {
  const data = JSON.parse(json) as T | ApiError;
  if (data !== null && typeof data === 'object' && 'error' in data) {
    const err = data as ApiError;
    throw new ApiRequestError(err.error, err.line);
  }
  return data as T;
}

export const api = {
  create(code: string, seed?: number): SimulationCreated {
    return parse<SimulationCreated>(crear(code, seed ?? -1));
  },

  reset(): SimulationCreated {
    return parse<SimulationCreated>(reiniciar());
  },

  step(policy: SchedulingPolicy, chosenProcessId?: number): StepResponse {
    return parse<StepResponse>(paso(policy, chosenProcessId ?? -1));
  },

  remove(): void {
    liberar();
  },
};
