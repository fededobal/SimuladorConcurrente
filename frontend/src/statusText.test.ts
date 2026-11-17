import { describe, expect, it } from 'vitest';
import { statusTextOf } from './statusText';

describe('statusTextOf', () => {
  it('plainStates', () => {
    expect(statusTextOf('paused', false, 0)).toEqual({ text: 'En pausa', tone: 'pause' });
    expect(statusTextOf('running', false, 0)).toEqual({ text: 'Ejecutando', tone: 'run' });
    expect(statusTextOf('deadlock', false, 0)).toEqual({ text: 'Interbloqueo', tone: 'bad' });
    expect(statusTextOf('finished', false, 0).tone).toBe('ok');
  });

  it('deadlockAfterAnErrorIsNotASynchronizationProblem', () => {
    expect(statusTextOf('deadlock', false, 1).text).toBe('Interbloqueo tras un error');
    expect(statusTextOf('finished', false, 2)).toEqual({ text: 'Fin con errores', tone: 'bad' });
  });

  it('waitingForADelayOnlyWhileTheSimulationCanAdvance', () => {
    expect(statusTextOf('running', true, 0).text).toBe('Esperando un delay');
    expect(statusTextOf('finished', true, 0).text).toBe('Terminó');
  });

  it('aFailedProcessTurnsTheStatusRedButKeepsItsText', () => {
    expect(statusTextOf('paused', false, 1)).toEqual({ text: 'En pausa', tone: 'bad' });
  });
});
