import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiRequestError } from './api';
import { appendInstant, EMPTY_TIMELINE, startTimeline, type Timeline } from './timeline';
import type { SchedulingPolicy, Snapshot } from './types';

export type SimStatus =
  | 'idle' | 'ready' | 'running' | 'paused' | 'finished' | 'deadlock' | 'error';

export interface SimError {
  message: string;
  line: number | null;
}

export const SPEEDS = [1200, 600, 300, 120] as const;

export function useSimulation(initialCode: string) {
  const [code, setCodeState] = useState(initialCode);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [timeline, setTimeline] = useState<Timeline>(EMPTY_TIMELINE);
  const [status, setStatus] = useState<SimStatus>('idle');
  const [error, setError] = useState<SimError | null>(null);
  const [speed, setSpeed] = useState<number>(600);
  const [policy, setPolicyState] = useState<SchedulingPolicy>('RANDOM');

  const activaRef = useRef(false);
  const statusRef = useRef<SimStatus>('idle');
  const timerRef = useRef<number | null>(null);
  // el intervalo lee la politica en cada paso: cambiarla no reinicia la simulacion
  const policyRef = useRef<SchedulingPolicy>('RANDOM');
  statusRef.current = status;

  const setPolicy = useCallback((p: SchedulingPolicy) => {
    policyRef.current = p;
    setPolicyState(p);
  }, []);

  // statusRef se actualiza en el acto: el intervalo lo lee antes de re-renderizar
  const setStat = (s: SimStatus) => {
    statusRef.current = s;
    setStatus(s);
  };

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const drop = useCallback(() => {
    clearTimer();
    if (activaRef.current) api.remove();
    activaRef.current = false;
    setSnapshot(null);
    setTimeline(EMPTY_TIMELINE);
    setError(null);
    setStat('idle');
  }, []);

  // detiene la simulacion y devuelve el editor a modo edicion
  const stop = useCallback(() => drop(), [drop]);

  // editar el codigo invalida la simulacion en curso
  const setCode = useCallback((next: string) => {
    setCodeState(next);
    if (activaRef.current || statusRef.current !== 'idle') drop();
  }, [drop]);

  const compile = useCallback((): boolean => {
    clearTimer();
    setError(null);
    try {
      const created = api.create(code);
      activaRef.current = true;
      setSnapshot(created.snapshot);
      setTimeline(startTimeline(created.snapshot));
      setStat(created.deadlock ? 'deadlock' : created.finished ? 'finished' : 'ready');
      return true;
    } catch (e) {
      const err = e as ApiRequestError;
      setError({ message: err.message, line: err.line ?? null });
      activaRef.current = false;
      setSnapshot(null);
      setTimeline(EMPTY_TIMELINE);
      setStat('error');
      return false;
    }
  }, [code]);

  const doStep = useCallback((): boolean => {
    if (!activaRef.current) return false;
    try {
      const res = api.step(policyRef.current);
      setSnapshot(res.snapshot);
      setTimeline((t) => appendInstant(t, res.snapshot));
      if (res.deadlock) { setStat('deadlock'); clearTimer(); return false; }
      if (res.finished) { setStat('finished'); clearTimer(); return false; }
      return true;
    } catch (e) {
      const err = e as ApiRequestError;
      setError({ message: err.message, line: err.line ?? null });
      setStat('error');
      clearTimer();
      return false;
    }
  }, []);

  const step = useCallback(() => {
    if (
      statusRef.current === 'idle' ||
      statusRef.current === 'error' ||
      statusRef.current === 'finished' ||
      statusRef.current === 'deadlock'
    ) {
      if (!compile()) return;
    }
    clearTimer();
    setStat('paused');
    doStep();
  }, [compile, doStep]);

  const play = useCallback(() => {
    if (
      statusRef.current === 'idle' ||
      statusRef.current === 'error' ||
      statusRef.current === 'finished' ||
      statusRef.current === 'deadlock'
    ) {
      if (!compile()) return;
    }
    setStat('running');
    clearTimer();
    timerRef.current = window.setInterval(() => {
      if (statusRef.current !== 'running') return;
      if (!doStep()) clearTimer();
    }, speed);
  }, [compile, doStep, speed]);

  const pause = useCallback(() => {
    clearTimer();
    if (statusRef.current === 'running') setStat('paused');
  }, []);

  // reajusta el intervalo si cambia la velocidad mientras corre
  useEffect(() => {
    if (statusRef.current !== 'running') return;
    clearTimer();
    timerRef.current = window.setInterval(() => {
      if (statusRef.current !== 'running') return;
      if (!doStep()) clearTimer();
    }, speed);
    return clearTimer;
  }, [speed, doStep]);

  useEffect(() => () => clearTimer(), []);

  return {
    code, setCode,
    snapshot, timeline, status, error,
    speed, setSpeed, speeds: SPEEDS,
    policy, setPolicy,
    play, pause, step, stop,
  };
}
