import { describe, expect, it } from 'vitest';
import { gutterChipsOf, lineMarksOf, MAX_TAGS, type ActiveLine } from './lineMarks';

function active(name: string, line: number, extra: Partial<ActiveLine> = {}): ActiveLine {
  return { name, line, color: '#000', state: 'READY', where: null, delayRemaining: null, ...extra };
}

describe('lineMarksOf', () => {
  it('markCarriesItsMostActiveProcess', () => {
    const [mark] = lineMarksOf([
      active('A', 3, { state: 'WAITING', where: 'c' }),
      active('B', 3, { state: 'RUNNING_MONITOR', where: 'M' }),
    ]);
    expect(mark.leader).toBe('B');
  });

  it('oneMarkPerLine', () => {
    const marks = lineMarksOf([active('A', 3), active('B', 3), active('C', 1)]);
    expect(marks.map((m) => m.line)).toEqual([1, 3]);
  });

  it('skipsProcessesWithoutLine', () => {
    expect(lineMarksOf([active('A', 0)])).toEqual([]);
  });

  it('bandTakesTheMostActiveProcess', () => {
    const marks = lineMarksOf([
      active('A', 5, { state: 'WAITING', where: 'c', color: '#111' }),
      active('B', 5, { state: 'RUNNING_MONITOR', where: 'M', color: '#222' }),
    ]);
    expect(marks[0].state).toBe('RUNNING_MONITOR');
    expect(marks[0].color).toBe('#222');
    expect(marks[0].tags.map((t) => t.title)).toEqual(['B', 'A']);
  });

  it('singleProcessTagSaysWhatItDoes', () => {
    const [mark] = lineMarksOf([active('Productor', 9, { state: 'RUNNING_MONITOR', where: 'Buffer' })]);
    expect(mark.tags[0].title).toBe('Productor');
    expect(mark.tags[0].detail).toBe('en Buffer');
  });

  it('sameStateAndPlaceShareOneTag', () => {
    const procs = [1, 2, 3].map((i) => active(`Cliente[${i}]`, 11, { state: 'COMPETING', where: 'Corralon' }));
    const [mark] = lineMarksOf(procs);
    expect(mark.tags).toHaveLength(1);
    expect(mark.tags[0].title).toBe('Cliente ×3');
    expect(mark.tags[0].detail).toBe('compiten por Corralon');
  });

  it('indexedCondsAreTheSamePlace', () => {
    // cada cliente duerme en su propia cond del arreglo: sigue siendo la misma espera
    const procs = [2, 5].map((i) => active(`Cliente[${i}]`, 11, { state: 'WAITING', where: `esperaCli[${i}]` }));
    const [mark] = lineMarksOf(procs);
    expect(mark.tags).toHaveLength(1);
    expect(mark.tags[0].detail).toBe('dormidos en wait(esperaCli[…])');
  });

  it('mixedFamiliesAreCounted', () => {
    const [mark] = lineMarksOf([
      active('A', 2, { state: 'COMPETING', where: 'M' }),
      active('B', 2, { state: 'COMPETING', where: 'M' }),
    ]);
    expect(mark.tags[0].title).toBe('2 procesos');
  });

  it('extraTagsAreSummarized', () => {
    const [mark] = lineMarksOf([
      active('A', 2, { state: 'RUNNING_MONITOR', where: 'M' }),
      active('B', 2, { state: 'COMPETING', where: 'M' }),
      active('C', 2, { state: 'WAITING', where: 'c' }),
      active('D', 2),
    ]);
    expect(mark.tags).toHaveLength(MAX_TAGS);
    expect(mark.hiddenNames).toEqual(['C', 'D']);
  });

  it('familiesSortByIndexNotByText', () => {
    const [mark] = lineMarksOf([active('P[10]', 1), active('P[2]', 1)]);
    expect(mark.tags[0].names).toEqual(['P[2]', 'P[10]']);
  });
});

describe('gutterChipsOf', () => {
  it('oneChipPerProcessWithSlotInsideTheLine', () => {
    const chips = gutterChipsOf([
      active('A', 4, { state: 'WAITING' }),
      active('B', 4, { state: 'RUNNING_PROCESS' }),
      active('C', 7),
    ]);
    const slot = Object.fromEntries(chips.map((c) => [c.name, c.slot]));
    expect(slot).toEqual({ B: 0, A: 1, C: 0 });
  });
});
