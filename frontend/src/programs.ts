// Programas del alumno: el que esta abierto en el editor (que se guarda solo) y la lista
// "Mis programas". Todo vive en el almacenamiento del navegador; no hay servidor. Las
// funciones de este modulo son puras o reciben el almacenamiento por parametro, para
// poder probarlas sin navegador.

/** El programa abierto en el editor. */
export interface Program {
  /** Id en "Mis programas", o null si todavia es un borrador (o un ejemplo sin tocar). */
  readonly id: string | null;
  readonly name: string;
  readonly code: string;
}

/** Un programa guardado en "Mis programas". */
export interface SavedProgram {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  /** Ultima modificacion, en ms (Date.now()). */
  readonly updatedAt: number;
}

/** Lo que se usa de `localStorage`; en los tests lo reemplaza un Map. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const DRAFT_KEY = 'simulador.programa.abierto';
export const LIBRARY_KEY = 'simulador.programas';
export const DEFAULT_NAME = 'Sin título';
/** Tope de programas guardados: el almacenamiento del navegador es chico. */
export const MAX_SAVED = 100;

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function parse(store: KeyValueStore, key: string): unknown {
  try {
    const raw = store.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    // sin almacenamiento (modo privado) o con datos rotos: como si no hubiera nada guardado
    return null;
  }
}

function write(store: KeyValueStore, key: string, value: unknown): boolean {
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // almacenamiento lleno o bloqueado: el llamador avisa que no se pudo guardar
    return false;
  }
}

/** El programa que quedo abierto la ultima vez, o null si no hay (o no se puede leer). */
export function readDraft(store: KeyValueStore): Program | null {
  const data = parse(store, DRAFT_KEY);
  if (!isRecord(data) || typeof data.code !== 'string' || typeof data.name !== 'string') return null;
  return { id: typeof data.id === 'string' ? data.id : null, name: data.name, code: data.code };
}

/** Guarda el programa abierto; false si el navegador no dejo. */
export function writeDraft(store: KeyValueStore, program: Program): boolean {
  return write(store, DRAFT_KEY, program);
}

/** "Mis programas", del mas reciente al mas viejo. Las entradas mal formadas se descartan. */
export function readLibrary(store: KeyValueStore): SavedProgram[] {
  const data = parse(store, LIBRARY_KEY);
  if (!Array.isArray(data)) return [];
  return data
    .filter((x): x is SavedProgram => isRecord(x) && typeof x.id === 'string'
      && typeof x.name === 'string' && typeof x.code === 'string' && typeof x.updatedAt === 'number')
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Guarda "Mis programas"; false si el navegador no dejo. */
export function writeLibrary(store: KeyValueStore, library: readonly SavedProgram[]): boolean {
  return write(store, LIBRARY_KEY, library);
}

/** La lista con el programa agregado o actualizado al principio (y recortada al tope). */
export function upsertProgram(
  library: readonly SavedProgram[], program: SavedProgram,
): SavedProgram[] {
  return [program, ...library.filter((p) => p.id !== program.id)].slice(0, MAX_SAVED);
}

/** La lista sin el programa de ese id. */
export function removeProgram(library: readonly SavedProgram[], id: string): SavedProgram[] {
  return library.filter((p) => p.id !== id);
}

/** Nombre sin espacios de mas; el nombre por defecto si queda vacio. */
export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ') || DEFAULT_NAME;
}

/**
 * Nombre de archivo para descargar el programa: "Productor/Consumidor" pasa a
 * "Productor-Consumidor.mon". Se quitan los caracteres que algun sistema no acepta.
 */
export function fileNameOf(name: string): string {
  const base = cleanName(name)
    .replace(/\.mon$/i, '')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/^[-. ]+|[-. ]+$/g, '');
  return `${base || 'programa'}.mon`;
}

/** Nombre del programa a partir del archivo abierto: sin carpeta ni extension. */
export function nameFromFile(fileName: string): string {
  const base = fileName.replace(/^.*[\\/]/, '').replace(/\.(mon|txt)$/i, '');
  return cleanName(base);
}
