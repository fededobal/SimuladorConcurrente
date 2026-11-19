import { describe, expect, it } from 'vitest';
import { arrayLabel, arrayNameOf, byUsage, groupMonitors, usageOf, usageText } from './monitorGroups';
import type { MonitorView, ProcRef } from './types';

function procs(n: number, from = 0): ProcRef[] {
  return Array.from({ length: n }, (_, i) => ({ id: from + i, name: `P${from + i}`, color: '#000' }));
}

/** Un monitor con esa cantidad de procesos compitiendo, bloqueados en una cond y ejecutando. */
function monitor(name: string, competing = 0, blocked = 0, owner = false): MonitorView {
  return {
    name,
    vars: [],
    conds: [{ name: 'c', queue: procs(blocked, 100) }, { name: 'd', queue: [] }],
    entryQueue: procs(competing),
    lockOwner: owner ? { id: 999, name: 'Q', color: '#000' } : null,
  };
}

describe('arrayNameOf', () => {
  it('elementOfAnArrayGivesTheArrayName', () => {
    expect(arrayNameOf('Escritorio[2]')).toBe('Escritorio');
    expect(arrayNameOf('Caja[10]')).toBe('Caja');
  });

  it('singleMonitorIsNotAnArray', () => {
    expect(arrayNameOf('Banco')).toBeNull();
  });
});

describe('groupMonitors', () => {
  it('singleMonitorsStayAloneAndArrayElementsGoTogether', () => {
    const groups = groupMonitors([
      monitor('Banco'), monitor('Escritorio[0]'), monitor('Escritorio[1]'), monitor('Registro'),
    ]);
    expect(groups.map((g) => [g.name, g.isArray, g.monitors.map((m) => m.name)])).toEqual([
      ['Banco', false, ['Banco']],
      ['Escritorio', true, ['Escritorio[0]', 'Escritorio[1]']],
      ['Registro', false, ['Registro']],
    ]);
  });

  it('arrayWithOneElementIsStillAnArray', () => {
    const [group] = groupMonitors([monitor('Caja[0]')]);
    expect(group.isArray).toBe(true);
    expect(arrayLabel(group)).toBe('Caja[0]');
  });

  it('twoArraysDoNotMix', () => {
    const groups = groupMonitors([monitor('A[0]'), monitor('B[0]'), monitor('A[1]')]);
    expect(groups.map((g) => g.monitors.length)).toEqual([2, 1]);
  });
});

describe('arrayLabel', () => {
  it('showsTheRangeOfIndexes', () => {
    const [group] = groupMonitors([monitor('Escritorio[0]'), monitor('Escritorio[1]'), monitor('Escritorio[2]')]);
    expect(arrayLabel(group)).toBe('Escritorio[0..2]');
  });
});

describe('usageOf', () => {
  it('addsCompetingRunningAndBlockedProcesses', () => {
    expect(usageOf(monitor('M', 2, 3, true))).toBe(6);
    expect(usageOf(monitor('M'))).toBe(0);
  });
});

describe('byUsage', () => {
  it('mostUsedFirst', () => {
    const sorted = byUsage([monitor('E[0]', 1), monitor('E[1]', 0, 3), monitor('E[2]', 0, 0, true), monitor('E[3]', 2, 2)]);
    expect(sorted.map((m) => m.name)).toEqual(['E[3]', 'E[1]', 'E[0]', 'E[2]']);
  });

  it('sameUsageKeepsTheOrderByIndex', () => {
    const sorted = byUsage([monitor('E[0]'), monitor('E[1]', 1), monitor('E[2]'), monitor('E[3]', 1)]);
    expect(sorted.map((m) => m.name)).toEqual(['E[1]', 'E[3]', 'E[0]', 'E[2]']);
  });

  it('doesNotChangeTheListItReceives', () => {
    const list = [monitor('E[0]'), monitor('E[1]', 4)];
    byUsage(list);
    expect(list.map((m) => m.name)).toEqual(['E[0]', 'E[1]']);
  });
});

describe('usageText', () => {
  it('singularPluralAndNone', () => {
    expect(usageText(0)).toBe('sin procesos');
    expect(usageText(1)).toBe('1 proceso');
    expect(usageText(4)).toBe('4 procesos');
  });
});
