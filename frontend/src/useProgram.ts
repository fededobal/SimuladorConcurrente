import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cleanName, readDraft, readLibrary, removeProgram, upsertProgram, writeDraft, writeLibrary,
  type KeyValueStore, type Program, type SavedProgram,
} from './programs';

/** Cuanto se espera sin teclear antes de guardar, en ms. */
const AUTOSAVE_DELAY = 400;

/** Estado del guardado automatico, para avisarlo en pantalla. */
export type SaveState = 'saved' | 'saving' | 'unavailable';

/** `localStorage`, o un almacenamiento que no guarda nada si el navegador lo niega. */
function browserStore(): KeyValueStore {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem: () => { throw new Error('sin almacenamiento'); } };
  }
}

function newId(): string {
  return `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/**
 * El programa abierto en el editor y la lista "Mis programas". El programa abierto se guarda
 * solo en el navegador (recargar la pestana ya no lo borra); si ademas esta en "Mis
 * programas", cada cambio actualiza tambien esa copia, como un archivo con guardado
 * automatico.
 *
 * @param fallback programa con el que se arranca si no hay nada guardado
 */
export function useProgram(fallback: Program) {
  const store = useRef<KeyValueStore>(browserStore()).current;
  const [program, setProgram] = useState<Program>(() => readDraft(store) ?? fallback);
  const [library, setLibrary] = useState<SavedProgram[]>(() => readLibrary(store));
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const libraryRef = useRef(library);
  libraryRef.current = library;

  const persistLibrary = useCallback((next: SavedProgram[]): boolean => {
    libraryRef.current = next;
    setLibrary(next);
    return writeLibrary(store, next);
  }, [store]);

  // Guardado automatico: un rato despues del ultimo cambio, no en cada tecla.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaveState('saving');
    const timer = window.setTimeout(() => {
      let ok = writeDraft(store, program);
      if (program.id !== null) {
        const entry = { id: program.id, name: program.name, code: program.code, updatedAt: Date.now() };
        ok = persistLibrary(upsertProgram(libraryRef.current, entry)) && ok;
      }
      setSaveState(ok ? 'saved' : 'unavailable');
    }, AUTOSAVE_DELAY);
    return () => window.clearTimeout(timer);
  }, [program, store, persistLibrary]);

  const setCode = useCallback((code: string) => {
    setProgram((p) => (p.code === code ? p : { ...p, code }));
  }, []);

  const rename = useCallback((name: string) => {
    setProgram((p) => ({ ...p, name: cleanName(name) }));
  }, []);

  /** Reemplaza el programa abierto (un ejemplo, un archivo, uno de "Mis programas"). */
  const open = useCallback((next: Program) => setProgram(next), []);

  /** Pasa el programa abierto a "Mis programas"; desde ahi sus cambios se guardan en esa copia. */
  const saveToLibrary = useCallback(() => {
    setProgram((p) => (p.id !== null ? p : { ...p, id: newId() }));
  }, []);

  /** Guarda en "Mis programas" una copia de un programa que no es el abierto. */
  const keepCopy = useCallback((copy: Program) => {
    persistLibrary(upsertProgram(libraryRef.current, {
      id: newId(), name: copy.name, code: copy.code, updatedAt: Date.now(),
    }));
  }, [persistLibrary]);

  /** Borra un programa de "Mis programas"; si es el abierto, queda como borrador. */
  const removeFromLibrary = useCallback((id: string) => {
    persistLibrary(removeProgram(libraryRef.current, id));
    setProgram((p) => (p.id === id ? { ...p, id: null } : p));
  }, [persistLibrary]);

  return { program, library, saveState, setCode, rename, open, saveToLibrary, keepCopy, removeFromLibrary };
}
