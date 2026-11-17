import { describe, expect, it } from 'vitest';
import {
  cleanName, DEFAULT_NAME, DRAFT_KEY, fileNameOf, LIBRARY_KEY, MAX_SAVED, nameFromFile,
  readDraft, readLibrary, removeProgram, upsertProgram, writeDraft, writeLibrary,
  type KeyValueStore, type SavedProgram,
} from './programs';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); } };
}

const brokenStore: KeyValueStore = {
  getItem: () => { throw new Error('bloqueado'); },
  setItem: () => { throw new Error('lleno'); },
};

function saved(id: string, updatedAt: number): SavedProgram {
  return { id, name: `Programa ${id}`, code: `process P${id} { skip; }`, updatedAt };
}

describe('draft', () => {
  it('roundTripsTheOpenProgram', () => {
    const store = memoryStore();
    const program = { id: 'a1', name: 'Mi buffer', code: 'monitor M { }' };
    expect(writeDraft(store, program)).toBe(true);
    expect(readDraft(store)).toEqual(program);
  });

  it('missingOrCorruptDraftIsNull', () => {
    expect(readDraft(memoryStore())).toBeNull();
    expect(readDraft(memoryStore({ [DRAFT_KEY]: '{no es json' }))).toBeNull();
    expect(readDraft(memoryStore({ [DRAFT_KEY]: '{"name":"x"}' }))).toBeNull();
  });

  it('blockedStorageDoesNotThrow', () => {
    // en modo privado el navegador puede negar el almacenamiento: se informa, no se rompe
    expect(readDraft(brokenStore)).toBeNull();
    expect(writeDraft(brokenStore, { id: null, name: 'x', code: '' })).toBe(false);
  });

  it('draftWithoutIdIsNotInTheLibrary', () => {
    const store = memoryStore({ [DRAFT_KEY]: '{"id":5,"name":"x","code":"y"}' });
    expect(readDraft(store)?.id).toBeNull();
  });
});

describe('library', () => {
  it('readsNewestFirstAndDropsMalformedEntries', () => {
    const store = memoryStore({
      [LIBRARY_KEY]: JSON.stringify([saved('viejo', 1), { id: 'roto' }, saved('nuevo', 9)]),
    });
    expect(readLibrary(store).map((p) => p.id)).toEqual(['nuevo', 'viejo']);
  });

  it('notAnArrayIsEmpty', () => {
    expect(readLibrary(memoryStore({ [LIBRARY_KEY]: '{"a":1}' }))).toEqual([]);
  });

  it('upsertReplacesTheSameIdAndPutsItFirst', () => {
    const library = [saved('a', 1), saved('b', 2)];
    const next = upsertProgram(library, { ...saved('a', 5), name: 'Renombrado' });
    expect(next.map((p) => p.id)).toEqual(['a', 'b']);
    expect(next[0].name).toBe('Renombrado');
  });

  it('upsertKeepsTheNewestWhenFull', () => {
    const library = Array.from({ length: MAX_SAVED }, (_, i) => saved(`p${i}`, i));
    const next = upsertProgram(library, saved('nuevo', 999));
    expect(next).toHaveLength(MAX_SAVED);
    expect(next[0].id).toBe('nuevo');
  });

  it('removeDropsOnlyThatProgram', () => {
    expect(removeProgram([saved('a', 1), saved('b', 2)], 'a').map((p) => p.id)).toEqual(['b']);
  });

  it('writeLibraryRoundTrips', () => {
    const store = memoryStore();
    writeLibrary(store, [saved('a', 1)]);
    expect(readLibrary(store)).toEqual([saved('a', 1)]);
  });
});

describe('names', () => {
  it('cleanNameCollapsesSpacesAndDefaults', () => {
    expect(cleanName('  Mi   buffer ')).toBe('Mi buffer');
    expect(cleanName('   ')).toBe(DEFAULT_NAME);
  });

  it('fileNameReplacesForbiddenCharacters', () => {
    expect(fileNameOf('Productor/Consumidor')).toBe('Productor-Consumidor.mon');
    expect(fileNameOf('ya.mon')).toBe('ya.mon');
    expect(fileNameOf('???')).toBe('programa.mon');
  });

  it('nameFromFileDropsFolderAndExtension', () => {
    expect(nameFromFile('C:\\tp\\buffer.mon')).toBe('buffer');
    expect(nameFromFile('practica 4.txt')).toBe('practica 4');
    expect(nameFromFile('sin-extension')).toBe('sin-extension');
  });
});
