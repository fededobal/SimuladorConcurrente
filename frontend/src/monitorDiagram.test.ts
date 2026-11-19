import { describe, expect, it } from 'vitest';
import { arrowsOf, eventsAbout, fitName, travelsOf } from './monitorDiagram';
import type { LogEntry, MonitorView } from './types';

let nextId = 0;
function event(kind: string, processId: number | null, resource: string, message = ''): LogEntry {
  return { id: `e${nextId++}`, instant: 4, processId, processColor: '#000', kind, resource, message };
}

function monitor(name: string, ownerId: number | null): MonitorView {
  return {
    name, vars: [], conds: [], entryQueue: [],
    lockOwner: ownerId === null ? null : { id: ownerId, name: `P${ownerId}`, color: '#000' },
  };
}

describe('travelsOf', () => {
  it('oneTravelPerEventInOrderWithTheProcessColor', () => {
    const enter = { ...event('ENTER', 2, 'M'), processColor: '#abc' };
    const call = { ...event('BLOCKED', 1, 'M'), processColor: '#123' };
    expect(travelsOf('M', [call, enter])).toEqual([
      { key: call.id, arrow: 'call', color: '#123' },
      { key: enter.id, arrow: 'entra', color: '#abc' },
    ]);
  });

  it('signalTravelHasNoColorBecauseTheWokenProcessTravels', () => {
    const [travel] = travelsOf('M', [event('SIGNAL', 1, 'M.c', 'P: signal(c) - despierta a Q')]);
    expect(travel.arrow).toBe('signal');
    expect(travel.color).toBeNull();
  });

  it('eventsThatMoveNobodyAreNotTravels', () => {
    expect(travelsOf('M', [event('ASSIGN', 1, 'M'), event('SIGNAL', 1, 'M.c', 'sin efecto')])).toEqual([]);
  });
});

describe('arrowsOf', () => {
  it('eachEventLightsItsArrow', () => {
    const arrows = arrowsOf('M', [
      event('BLOCKED', 1, 'M'), event('ENTER', 2, 'M'), event('WAIT', 3, 'M.c'), event('RETURN', 4, 'M'),
    ]);
    expect([...arrows].sort()).toEqual(['call', 'entra', 'return', 'wait']);
  });

  it('signalOnlyCountsWhenItWakesSomeone', () => {
    expect(arrowsOf('M', [event('SIGNAL', 1, 'M.c', 'P: signal(c) - sin efecto (cola vacía)')]).size).toBe(0);
    expect(arrowsOf('M', [event('SIGNAL', 1, 'M.c', 'P: signal(c) - despierta a Q')]).has('signal')).toBe(true);
  });

  it('otherMonitorsAndPrefixesAreIgnored', () => {
    // "M2" empieza con "M" pero es otro monitor
    expect(arrowsOf('M', [event('ENTER', 1, 'M2'), event('WAIT', 1, 'Otro.c')]).size).toBe(0);
  });
});

describe('eventsAbout', () => {
  it('includesWhatTheOwnerDidInside', () => {
    const assign = event('ASSIGN', 1, 'dato', 'Productor: dato = 2');
    const foreign = event('ASSIGN', 2, 'i', 'Consumidor: i++ => 3');
    expect(eventsAbout(monitor('Buffer', 1), [assign, foreign])).toEqual([assign]);
  });

  it('includesEventsThatNameTheMonitorOrItsConds', () => {
    const enter = event('ENTER', 2, 'Buffer');
    const wait = event('WAIT', 3, 'Buffer.libre');
    const other = event('ENTER', 4, 'Otro');
    expect(eventsAbout(monitor('Buffer', null), [enter, wait, other])).toEqual([enter, wait]);
  });

  it('systemEventsAreLeftOut', () => {
    expect(eventsAbout(monitor('M', null), [event('DEADLOCK', null, 'M')])).toEqual([]);
  });
});

describe('fitName', () => {
  it('shortNameStaysAsItIs', () => {
    expect(fitName('Cliente[3]', 16)).toBe('Cliente[3]');
  });

  it('longNameKeepsItsIndex', () => {
    const fitted = fitName('ClientePreferencialDelBancoCentral[12]', 16);
    expect(fitted).toBe('ClientePref…[12]');
    expect(fitted.length).toBe(16);
  });

  it('longNameWithoutIndexIsCutAtTheEnd', () => {
    expect(fitName('AdministradorGeneral', 8)).toBe('Adminis…');
  });

  it('indexTooLongToKeepIsCutLikeAnyText', () => {
    expect(fitName('M[123456789]', 6)).toBe('M[123…');
  });
});
