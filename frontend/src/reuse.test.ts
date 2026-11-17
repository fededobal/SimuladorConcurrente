import { describe, expect, it } from 'vitest';
import { reuseUnchanged } from './reuse';

describe('reuseUnchanged', () => {
  it('equalValueReturnsThePreviousObject', () => {
    const prev = { a: 1, list: [{ x: 1 }, { x: 2 }] };
    const next = { a: 1, list: [{ x: 1 }, { x: 2 }] };
    expect(reuseUnchanged(prev, next)).toBe(prev);
  });

  it('onlyTheChangedBranchIsNew', () => {
    const prev = { processes: [{ id: 1, line: 3 }, { id: 2, line: 7 }], instant: 4 };
    const next = { processes: [{ id: 1, line: 3 }, { id: 2, line: 8 }], instant: 5 };
    const merged = reuseUnchanged(prev, next);
    expect(merged).toEqual(next);
    expect(merged).not.toBe(prev);
    expect(merged.processes[0]).toBe(prev.processes[0]);
    expect(merged.processes[1]).not.toBe(prev.processes[1]);
  });

  it('arrayThatGrowsKeepsItsOldItems', () => {
    const prev = [{ t: 'a' }, { t: 'b' }];
    const next = [{ t: 'a' }, { t: 'b' }, { t: 'c' }];
    const merged = reuseUnchanged(prev, next);
    expect(merged).toHaveLength(3);
    expect(merged[0]).toBe(prev[0]);
    expect(merged[1]).toBe(prev[1]);
  });

  it('arrayThatShrinksIsNotThePreviousOne', () => {
    const prev = [{ t: 'a' }, { t: 'b' }];
    const merged = reuseUnchanged(prev, [{ t: 'a' }]);
    expect(merged).toEqual([{ t: 'a' }]);
    expect(merged).not.toBe(prev);
  });

  it('nullAndPrimitivesCompareByValue', () => {
    const prev = { owner: null as { id: number } | null, name: 'M' };
    expect(reuseUnchanged(prev, { owner: null, name: 'M' })).toBe(prev);
    const merged = reuseUnchanged(prev, { owner: { id: 1 }, name: 'M' });
    expect(merged.owner).toEqual({ id: 1 });
  });

  it('addedOrRemovedKeysAreAChange', () => {
    const prev: Record<string, number> = { a: 1 };
    expect(reuseUnchanged(prev, { a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
    const more: Record<string, number> = { a: 1, b: 2 };
    expect(reuseUnchanged(more, { a: 1 })).not.toBe(more);
  });

  it('arrayVersusObjectIsReplaced', () => {
    expect(reuseUnchanged<unknown>([1], { 0: 1 })).toEqual({ 0: 1 });
  });
});
