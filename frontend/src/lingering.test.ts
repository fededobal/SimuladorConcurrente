import { describe, expect, it } from 'vitest';
import { departedFrom, sameKeys, withDeparted } from './lingering';

const key = (s: string) => s;

describe('sameKeys', () => {
  it('comparesKeysInOrder', () => {
    expect(sameKeys(['a', 'b'], ['a', 'b'], key)).toBe(true);
    expect(sameKeys(['a', 'b'], ['b', 'a'], key)).toBe(false);
    expect(sameKeys(['a'], ['a', 'b'], key)).toBe(false);
  });
});

describe('departedFrom', () => {
  it('listsTheOnesThatLeftWithTheirPlace', () => {
    expect(departedFrom(['a', 'b', 'c'], ['b'], key)).toEqual([
      { item: 'a', index: 0 }, { item: 'c', index: 2 },
    ]);
  });

  it('nobodyLeftWhenTheListOnlyGrows', () => {
    expect(departedFrom(['a'], ['a', 'b'], key)).toEqual([]);
  });
});

describe('withDeparted', () => {
  it('keepsTheDepartedInTheirOldPlace', () => {
    const merged = withDeparted(['b', 'c'], [{ item: 'a', index: 0 }], key);
    expect(merged.map((m) => `${m.item}${m.leaving ? '-' : ''}`)).toEqual(['a-', 'b', 'c']);
    // los que quedan ya ocupan su lugar nuevo: es lo que los hace subir
    expect(merged.filter((m) => !m.leaving).map((m) => m.index)).toEqual([0, 1]);
  });

  it('theDepartedPastTheEndGoLast', () => {
    const merged = withDeparted(['a'], [{ item: 'z', index: 5 }], key);
    expect(merged.map((m) => m.item)).toEqual(['a', 'z']);
  });

  it('severalDepartedKeepTheirOrder', () => {
    const merged = withDeparted(['c'], [{ item: 'b', index: 1 }, { item: 'a', index: 0 }], key);
    expect(merged.map((m) => m.item)).toEqual(['a', 'b', 'c']);
  });

  it('oneThatCameBackIsNotRepeated', () => {
    const merged = withDeparted(['a', 'b'], [{ item: 'a', index: 0 }], key);
    expect(merged.map((m) => m.item)).toEqual(['a', 'b']);
    expect(merged.every((m) => !m.leaving)).toBe(true);
  });
});
