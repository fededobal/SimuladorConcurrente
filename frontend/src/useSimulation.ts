import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiRequestError } from './api';
import type { Snapshot } from './types';

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
  const [status, setStatus] = useState<SimStatus>('idle');
  const [error, setError] = useState<SimError | null>(null);
  const [speed, setSpeed] = useState<number>(600);

  const activaRef = useRef(false);
  const statusRef = useRef<SimStatus>('idle');
  const timerRef = useRef<number | null>(null);
  statusRef.current = status;

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
      setSnapshot(created.initial.snapshot);
      setStat(created.deadlock ? 'deadlock' : created.finished ? 'finished' : 'ready');
      return true;
    } catch (e) {
      const err = e as ApiRequestError;
      setError({ message: err.message, line: err.line ?? null });
      activaRef.current = false;
      setSnapshot(null);
      setStat('error');
      return false;
    }
  }, [code]);

  const doStep = useCallback((): boolean => {
    if (!activaRef.current) return false;
    try {
      const res = api.step('RANDOM');
      const last = res.entries[res.entries.length - 1];
      if (last) setSnapshot(last.snapshot);
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
    if (statusRef.current === 'idle' || statusRef.current === 'error') {
      if (!compile()) return;
    }
    if (statusRef.current === 'finished' || statusRef.current === 'deadlock') return;
    clearTimer();
    setStat('paused');
    doStep();
  }, [compile, doStep]);

  const play = useCallback(() => {
    if (statusRef.current === 'idle' || statusRef.current === 'error') {
      if (!compile()) return;
    }
    if (statusRef.current === 'finished' || statusRef.current === 'deadlock') return;
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

  const reset = useCallback(() => {
    clearTimer();
    if (!activaRef.current) { compile(); return; }
    try {
      const created = api.reset();
      setSnapshot(created.initial.snapshot);
      setError(null);
      setStat('ready');
    } catch {
      compile();
    }
  }, [compile]);

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
    snapshot, status, error,
    speed, setSpeed, speeds: SPEEDS,
    play, pause, step, reset, stop,
  };
}
