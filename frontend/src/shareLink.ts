// Enlace para compartir un programa: el codigo viaja en el fragmento de la direccion
// (lo que sigue al #), que el navegador no manda a ningun servidor. No hay nada que subir
// ni cuenta que crear, y el programa sigue sin salir de las computadoras de quien lo
// comparte y de quien lo abre.

import { cleanName, DEFAULT_NAME } from './programs';
import type { SchedulingPolicy } from './types';

/** Lo que lleva un enlace: el programa y, si lo hay, como repetir una ejecucion. */
export interface SharedProgram {
  readonly name: string;
  readonly code: string;
  /** Semilla de la ejecucion que se compartio, o null. */
  readonly seed: number | null;
  /** Politica de turnos de esa ejecucion, o null si no se indico. */
  readonly policy: SchedulingPolicy | null;
}

/** Largo maximo del codigo que se acepta de un enlace: un programa pesa unos pocos KB. */
const MAX_CODE_LENGTH = 100_000;

const POLICY_PARAM: Record<SchedulingPolicy, string> = { RANDOM: 'azar', ROUND_ROBIN: 'ronda' };

/** Texto a base64 apto para una direccion (sin +, / ni =), pasando por UTF-8 por las tildes. */
function toBase64Url(text: string): string {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded: string): string | null {
  try {
    const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    // base64 invalido o bytes que no son UTF-8: el enlace esta cortado o mal copiado
    return null;
  }
}

/** Fragmento (sin el #) que representa el programa. */
export function encodeShare(shared: SharedProgram): string {
  const params = new URLSearchParams();
  params.set('nombre', shared.name);
  if (shared.seed !== null) params.set('semilla', String(shared.seed));
  if (shared.policy !== null) params.set('turnos', POLICY_PARAM[shared.policy]);
  // el codigo al final: si un programa de mensajeria corta el enlace, se pierde solo codigo
  params.set('codigo', toBase64Url(shared.code));
  return params.toString();
}

/** El programa de un fragmento (con o sin #), o null si el fragmento no es un enlace valido. */
export function decodeShare(hash: string): SharedProgram | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const encoded = params.get('codigo');
  if (!encoded) return null;
  const code = fromBase64Url(encoded);
  if (code === null || code.length > MAX_CODE_LENGTH) return null;

  const seed = Number(params.get('semilla'));
  const turnos = params.get('turnos');
  const policy = (Object.keys(POLICY_PARAM) as SchedulingPolicy[])
    .find((p) => POLICY_PARAM[p] === turnos) ?? null;
  return {
    name: cleanName(params.get('nombre') ?? DEFAULT_NAME).slice(0, 60),
    code: code.replace(/\r\n?/g, '\n'),
    seed: params.has('semilla') && Number.isSafeInteger(seed) && seed >= 0 ? seed : null,
    policy,
  };
}
