import { describe, expect, it } from 'vitest';
import type { VisibleState } from './processStates';
import type { TimelineColumn } from './timeline';
import { labelsOf, ownerSegmentsOf, segmentsOf, visibleRows } from './timelineLayout';

function column(instant: number, state: VisibleState, where: string | null, owner: number | null): TimelineColumn {
  return { instant, states: { 1: state }, where: { 1: where }, owners: { M: owner }, events: [] };
}

describe('segmentsOf', () => {
  it('mergesConsecutiveInstantsInTheSameStateAndPlace', () => {
    const columns = [
      column(1, 'RUNNING_PROCESS', null, null),
      column(2, 'RUNNING_MONITOR', 'M', 1),
      column(3, 'RUNNING_MONITOR', 'M', 1),
      column(4, 'WAITING', 'c', null),
    ];
    expect(segmentsOf(1, columns)).toEqual([
      { state: 'RUNNING_PROCESS', where: null, from: 0, length: 1 },
      { state: 'RUNNING_MONITOR', where: 'M', from: 1, length: 2 },
      { state: 'WAITING', where: 'c', from: 3, length: 1 },
    ]);
  });

  it('samestateInAnotherPlaceIsAnotherSegment', () => {
    const columns = [column(1, 'WAITING', 'a', null), column(2, 'WAITING', 'b', null)];
    expect(segmentsOf(1, columns)).toHaveLength(2);
  });

  it('terminatedHasNoBar', () => {
    const columns = [column(1, 'RUNNING_PROCESS', null, null), column(2, 'TERMINATED', null, null)];
    expect(segmentsOf(1, columns)).toHaveLength(1);
  });

  it('unknownProcessHasNoSegments', () => {
    expect(segmentsOf(9, [column(1, 'READY', null, null)])).toEqual([]);
  });
});

describe('ownerSegmentsOf', () => {
  it('oneSegmentPerOwnerChange', () => {
    const columns = [
      column(1, 'READY', null, null), column(2, 'READY', null, 1),
      column(3, 'READY', null, 1), column(4, 'READY', null, null),
    ];
    expect(ownerSegmentsOf('M', columns)).toEqual([
      { owner: null, from: 0, length: 1 },
      { owner: 1, from: 1, length: 2 },
      { owner: null, from: 3, length: 1 },
    ]);
  });
});

describe('labelsOf', () => {
  it('longLabelFirstThenShort', () => {
    expect(labelsOf({ state: 'RUNNING_MONITOR', where: 'Buffer', from: 0, length: 1 }))
      .toEqual(['en Buffer', 'Buffer']);
    expect(labelsOf({ state: 'COMPETING', where: 'Buffer', from: 0, length: 1 }))
      .toEqual(['compite por Buffer', 'compite']);
    expect(labelsOf({ state: 'WAITING', where: 'libre', from: 0, length: 1 }))
      .toEqual(['wait(libre)', 'wait']);
  });

  it('readyHasNoLabel', () => {
    expect(labelsOf({ state: 'READY', where: null, from: 0, length: 1 })).toEqual([]);
  });
});

describe('visibleRows', () => {
  it('rendersOnlyWhatIsOnScreenPlusOverscan', () => {
    // 1000 filas de 28 px, se ven 10, desplazado hasta la fila 100
    const range = visibleRows(2800, 280, 28, 1000, 5);
    expect(range).toEqual({ first: 95, end: 115 });
  });

  it('clampsAtBothEnds', () => {
    expect(visibleRows(0, 280, 28, 1000, 5)).toEqual({ first: 0, end: 15 });
    expect(visibleRows(27_900, 280, 28, 1000, 5).end).toBe(1000);
  });

  it('fewRowsAreAllRendered', () => {
    expect(visibleRows(0, 280, 28, 3)).toEqual({ first: 0, end: 3 });
  });

  it('emptyListHasEmptyRange', () => {
    expect(visibleRows(0, 280, 28, 0)).toEqual({ first: 0, end: 0 });
  });

  it('unmeasuredViewportStillRendersSomething', () => {
    const range = visibleRows(0, 0, 28, 1000);
    expect(range.first).toBe(0);
    expect(range.end).toBeGreaterThan(10);
    expect(range.end).toBeLessThan(100);
  });
});
