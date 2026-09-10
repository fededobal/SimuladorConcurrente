import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiRequestError } from './api';
import type { LogEntry, SchedulingPolicy, Snapshot } from './types';

export type SimStatus =
  | 'idle'
  | 'ready'
  | 'running'
  | 'paused'
  | 'finished'
  | 'deadlock'
  | 'error';

export interface SimError {
  message: string;
  line: number | null;
}

const SPEEDS = [1500, 1000, 500, 200] as const;

export function useSimulation(initialCode: string) {
  const [code, setCode] = useState(initialCode);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<SimStatus>('idle');
  const [error, setError] = useState<SimError | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [policy, setPolicy] = useState<SchedulingPolicy>('RANDOM');
  const [speed, setSpeed] = useState<number>(1000);

  const sessionRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const statusRef = useRef<SimStatus>('idle');
  const busyRef = useRef(false);
  statusRef.current = status;

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const liveIndex = entries.length - 1;
  const viewIndex = hoverIndex ?? liveIndex;
  const snapshot: Snapshot | null = entries[viewIndex]?.snapshot ?? null;
  const isHistorical = hoverIndex !== null && hoverIndex !== liveIndex;

  const compile = useCallback(async (): Promise<boolean> => {
    clearTimer();
    setError(null);
    setHoverIndex(null);
    try {
      const created = await api.create(code);
      sessionRef.current = created.id;
      setSessionId(created.id);
      setEntries([created.initial]);
      const next: SimStatus = created.deadlock ? 'deadlock' : created.finished ? 'finished' : 'ready';
      setStatus(next);
      statusRef.current = next;
      return true;
    } catch (e) {
      const err = e as ApiRequestError;
      setError({ message: err.message, line: err.line ?? null });
      setStatus('error');
      statusRef.current = 'error';
      setEntries([]);
      setSessionId(null);
      sessionRef.current = null;
      return false;
    }
  }, [code]);

  const doStep = useCallback(
    async (chosenProcessId?: number): Promise<boolean> => {
      const id = sessionRef.current;
      if (!id || busyRef.current) return false;
      busyRef.current = true;
      try {
        const res = await api.step(id, policy, chosenProcessId);
        if (res.entries.length > 0) {
          setEntries((prev) => [...prev, ...res.entries]);
        }
        if (res.deadlock) {
          setStatus('deadlock');
          clearTimer();
          return false;
        }
        if (res.finished) {
          setStatus('finished');
          clearTimer();
          return false;
        }
        return true;
      } catch (e) {
        const err = e as ApiRequestError;
        setError({ message: err.message, line: err.line ?? null });
        setStatus('error');
        clearTimer();
        return false;
      } finally {
        busyRef.current = false;
      }
    },
    [policy],
  );

  const stepOnce = useCallback(
    async (chosenProcessId?: number) => {
      setHoverIndex(null);
      if (statusRef.current === 'idle' || statusRef.current === 'error') {
        if (!(await compile())) return;
      }
      if (statusRef.current === 'finished' || statusRef.current === 'deadlock') return;
      setStatus('paused');
      statusRef.current = 'paused';
      await doStep(chosenProcessId);
    },
    [compile, doStep],
  );

  const play = useCallback(async () => {
    setHoverIndex(null);
    if (statusRef.current === 'idle' || statusRef.current === 'error') {
      if (!(await compile())) return;
    }
    if (statusRef.current === 'finished' || statusRef.current === 'deadlock') return;
    setStatus('running');
    statusRef.current = 'running';
    clearTimer();
    timerRef.current = window.setInterval(async () => {
      if (statusRef.current !== 'running') return;
      const cont = await doStep();
      if (!cont) clearTimer();
    }, speed);
  }, [compile, doStep, speed]);

  const pause = useCallback(() => {
    clearTimer();
    if (statusRef.current === 'running') setStatus('paused');
  }, []);

  const reset = useCallback(async () => {
    clearTimer();
    setHoverIndex(null);
    const id = sessionRef.current;
    if (!id) {
      await compile();
      return;
    }
    try {
      const created = await api.reset(id);
      setEntries([created.initial]);
      setError(null);
      setStatus('ready');
    } catch {
      await compile();
    }
  }, [compile]);

  const stop = useCallback(() => {
    clearTimer();
    setHoverIndex(null);
    const id = sessionRef.current;
    if (id) void api.remove(id);
    sessionRef.current = null;
    setSessionId(null);
    setEntries([]);
    setStatus('idle');
    setError(null);
  }, []);

  // reajusta el intervalo si cambia la velocidad mientras corre
  useEffect(() => {
    if (statusRef.current === 'running') {
      clearTimer();
      timerRef.current = window.setInterval(async () => {
        if (statusRef.current !== 'running') return;
        const cont = await doStep();
        if (!cont) clearTimer();
      }, speed);
    }
    return clearTimer;
  }, [speed, doStep]);

  useEffect(() => () => clearTimer(), []);

  return {
    code,
    setCode,
    sessionId,
    entries,
    status,
    error,
    policy,
    setPolicy,
    speed,
    setSpeed,
    speeds: SPEEDS,
    snapshot,
    viewIndex,
    liveIndex,
    hoverIndex,
    setHoverIndex,
    isHistorical,
    compile,
    stepOnce,
    play,
    pause,
    reset,
    stop,
  };
}
