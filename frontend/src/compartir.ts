import type { SchedulingPolicy } from './types';

// El programa viaja comprimido en el fragmento de la URL (#p=...). El fragmento no se manda
// al servidor: compartir no necesita backend ni guarda el programa en ningun lado.

export interface Compartido {
  readonly codigo: string;
  readonly semilla: number | null;
  readonly politica: SchedulingPolicy;
}

async function comprimir(texto: string): Promise<string> {
  const flujo = new Blob([texto]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const bytes = new Uint8Array(await new Response(flujo).arrayBuffer());
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  // base64url: sin '+', '/' ni '=' para que no haya que escapar nada en la URL
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function descomprimir(base64url: string): Promise<string> {
  const binario = atob(base64url.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
  const flujo = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(flujo).text();
}

/** Enlace a esta misma pagina con el programa, la semilla y la politica en el fragmento. */
export async function enlaceCompartido(c: Compartido): Promise<string> {
  const params = new URLSearchParams({ p: await comprimir(c.codigo) });
  if (c.semilla !== null) params.set('semilla', String(c.semilla));
  if (c.politica === 'ROUND_ROBIN') params.set('turnos', 'ronda');
  const url = new URL(window.location.href);
  url.hash = params.toString();
  return url.toString();
}

/** Lee un programa compartido del fragmento; null si no hay o esta roto. */
export async function leerCompartido(fragmento: string): Promise<Compartido | null> {
  const params = new URLSearchParams(fragmento.replace(/^#/, ''));
  const p = params.get('p');
  if (!p) return null;
  try {
    const semilla = params.get('semilla');
    return {
      codigo: await descomprimir(p),
      semilla: semilla && /^\d{1,9}$/.test(semilla) ? Number(semilla) : null,
      politica: params.get('turnos') === 'ronda' ? 'ROUND_ROBIN' : 'RANDOM',
    };
  } catch {
    return null;
  }
}
