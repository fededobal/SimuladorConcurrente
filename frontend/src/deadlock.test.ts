import { describe, expect, it } from 'vitest';
import { blockedProcesses, placeOf, wakeOf } from './deadlock';
import type { MonitorView, ProcessView, Snapshot } from './types';

function proc(id: number, name: string, extra: Partial<ProcessView>): ProcessView {
  return {
    id, name, color: '#000', state: 'BLOCKED', blockReason: null, blockedOn: null, location: null,
    line: 1, locals: [], error: null, advanced: false, advanceOrder: -1, holding: [],
    delayRemaining: null, ...extra,
  };
}

function monitor(name: string, owner: ProcessView | null): MonitorView {
  return {
    name, vars: [], conds: [], entryQueue: [],
    lockOwner: owner ? { id: owner.id, name: owner.name, color: owner.color } : null,
  };
}

function snapshot(processes: ProcessView[], monitors: MonitorView[]): Snapshot {
  return { instant: 3, processes, monitors, output: [] };
}

describe('blockedProcesses', () => {
  it('waitWithNobodyToSignal', () => {
    // el ejemplo Deadlock: P hace wait(c) y no hay otro proceso
    const p = proc(1, 'P', { blockReason: 'COND_WAIT', blockedOn: 'M.c', line: 6 });
    const [b] = blockedProcesses(snapshot([p], [monitor('M', null)]));
    expect(b).toMatchObject({ kind: 'cond', monitor: 'M', cond: 'c', holding: [] });
    expect(placeOf(b)).toBe('M.c, línea 6');
    expect(wakeOf(b)).toBe('signal(c): nadie puede');
  });

  it('nestedCallKeepsTheOuterMonitor', () => {
    // llamadas cerradas (ADR 0007): P espera en B.c sin soltar A; Q no puede entrar a A
    const p = proc(1, 'P', { blockReason: 'COND_WAIT', blockedOn: 'B.c', holding: ['A'], line: 9 });
    const q = proc(2, 'Q', { blockReason: 'MONITOR_ENTRY', blockedOn: 'A', line: 20 });
    const rows = blockedProcesses(snapshot([p, q], [monitor('A', p), monitor('B', null)]));
    expect(rows[0].holding).toEqual(['A']);
    expect(rows[1]).toMatchObject({ kind: 'entry', monitor: 'A', owner: 'P' });
    expect(placeOf(rows[1])).toBe('entrada de A, línea 20');
    expect(wakeOf(rows[1])).toBe('que P salga de A: está bloqueado');
  });

  it('condOfAMonitorArrayKeepsItsIndex', () => {
    const p = proc(1, 'P', { blockReason: 'COND_WAIT', blockedOn: 'Mesa[2].libre' });
    const [b] = blockedProcesses(snapshot([p], []));
    expect(b.monitor).toBe('Mesa[2]');
    expect(b.cond).toBe('libre');
  });

  it('terminatedAndReadyProcessesAreNotListed', () => {
    const done = proc(1, 'A', { state: 'TERMINATED' });
    const ready = proc(2, 'B', { state: 'READY' });
    expect(blockedProcesses(snapshot([done, ready], []))).toEqual([]);
  });
});
