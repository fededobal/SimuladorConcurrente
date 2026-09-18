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

  const sessionRef = useRef<string | null>(null);
  const statusRef = useRef<SimStatus>('idle');
  const timerRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  statusRef.current = status;

  // statusRef se actualiza en el acto: los callbacks async lo leen antes de re-renderizar
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
    const id = sessionRef.current;
    if (id) void api.remove(id);
    sessionRef.current = null;
    setSnapshot(null);
    setError(null);
    setStat('idle');
  }, []);

  // editar el codigo invalida la simulacion en curso
  const setCode = useCallback((next: string) => {
    setCodeState(next);
    if (sessionRef.current || statusRef.current !== 'idle') drop();
  }, [drop]);

  const compile = useCallback(async (): Promise<boolean> => {
    clearTimer();
    setError(null);
    try {
      const created = await api.create(code);
      sessionRef.current = created.id;
      setSnapshot(created.initial.snapshot);
      setStat(created.deadlock ? 'deadlock' : created.finished ? 'finished' : 'ready');
      return true;
    } catch (e) {
      const err = e as ApiRequestError;
      setError({ message: err.message, line: err.line ?? null });
      sessionRef.current = null;
      setSnapshot(null);
      setStat('error');
      return false;
    }
  }, [code]);

  const doStep = useCallback(async (): Promise<boolean> => {
    const id = sessionRef.current;
    if (!id || busyRef.current) return false;
    busyRef.current = true;
    try {
      const res = await api.step(id, 'RANDOM');
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
    } finally {
      busyRef.current = false;
    }
  }, []);

  const step = useCallback(async () => {
    if (statusRef.current === 'idle' || statusRef.current === 'error') {
      if (!(await compile())) return;
    }
    if (statusRef.current === 'finished' || statusRef.current === 'deadlock') return;
    clearTimer();
    setStat('paused');
    await doStep();
  }, [compile, doStep]);

  const play = useCallback(async () => {
    if (statusRef.current === 'idle' || statusRef.current === 'error') {
      if (!(await compile())) return;
    }
    if (statusRef.current === 'finished' || statusRef.current === 'deadlock') return;
    setStat('running');
    clearTimer();
    timerRef.current = window.setInterval(async () => {
      if (statusRef.current !== 'running') return;
      if (!(await doStep())) clearTimer();
    }, speed);
  }, [compile, doStep, speed]);

  const pause = useCallback(() => {
    clearTimer();
    if (statusRef.current === 'running') setStat('paused');
  }, []);

  const reset = useCallback(async () => {
    clearTimer();
    const id = sessionRef.current;
    if (!id) { await compile(); return; }
    try {
      const created = await api.reset(id);
      setSnapshot(created.initial.snapshot);
      setError(null);
      setStat('ready');
    } catch {
      await compile();
    }
  }, [compile]);

  // reajusta el intervalo si cambia la velocidad mientras corre
  useEffect(() => {
    if (statusRef.current !== 'running') return;
    clearTimer();
    timerRef.current = window.setInterval(async () => {
      if (statusRef.current !== 'running') return;
      if (!(await doStep())) clearTimer();
    }, speed);
    return clearTimer;
  }, [speed, doStep]);

  useEffect(() => () => clearTimer(), []);

  return {
    code, setCode,
    snapshot, status, error,
    speed, setSpeed, speeds: SPEEDS,
    play, pause, step, reset,
  };
}
