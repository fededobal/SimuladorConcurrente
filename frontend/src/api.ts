import type {
  ApiError,
  SchedulingPolicy,
  SimulationCreated,
  StepResponse,
} from './types';

// En desarrollo queda vacio y el proxy de Vite manda /api a localhost:8080. En un deploy
// no hay proxy: hay que apuntar VITE_API_URL al origen donde corre el backend Spring Boot
// (p. ej. https://simulador-api.midominio.com), que ademas tiene que permitir CORS.
const ORIGEN = import.meta.env.VITE_API_URL ?? '';

const BASE = `${ORIGEN}/api/simulations`;

export class ApiRequestError extends Error {
  line: number | null;
  constructor(message: string, line: number | null) {
    super(message);
    this.line = line;
  }
}

async function parse<T>(reqP: Promise<Response>): Promise<T> {
  let res: Response;
  try {
    res = await reqP;
  } catch {
    // fetch solo rechaza por fallas de red: el backend caido o dormido, o el navegador
    // bloqueando la respuesta porque el origen de esta pagina no esta habilitado en CORS.
    throw new ApiRequestError(
      ORIGEN
        ? `No se pudo conectar con el backend (${ORIGEN}). Puede estar caido o dormido, o este origen no estar habilitado en su CORS.`
        : 'No se pudo conectar con el backend. Revisa que este corriendo en http://localhost:8080.',
      null,
    );
  }
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
