import type {
  ApiError,
  SchedulingPolicy,
  SimulationCreated,
  StepResponse,
} from './types';

const BASE = '/api/simulations';

export class ApiRequestError extends Error {
  line: number | null;
  constructor(message: string, line: number | null) {
    super(message);
    this.line = line;
  }
}

async function parse<T>(reqP: Promise<Response>): Promise<T> {
  const res = await reqP;
  if (!res.ok) {
    let err: ApiError = { error: `Error HTTP ${res.status}`, line: null };
    try {
      err = await res.json();
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new ApiRequestError(err.error, err.line);
  }
  return res.json() as Promise<T>;
}

export const api = {
  create(code: string, seed?: number): Promise<SimulationCreated> {
    return parse(
      fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, seed }),
      }),
    );
  },

  reset(id: string): Promise<SimulationCreated> {
    return parse(fetch(`${BASE}/${id}/reset`, { method: 'POST' }));
  },

  step(id: string, policy: SchedulingPolicy, chosenProcessId?: number): Promise<StepResponse> {
    return parse(
      fetch(`${BASE}/${id}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policy, chosenProcessId: chosenProcessId ?? null }),
      }),
    );
  },

  remove(id: string): Promise<void> {
    return fetch(`${BASE}/${id}`, { method: 'DELETE' }).then(() => undefined);
  },
};
