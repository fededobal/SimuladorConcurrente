import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiRequestError } from './api';
import { appendInstant, EMPTY_TIMELINE, startTimeline, type Timeline } from './timeline';
import type { LogEntry, SchedulingPolicy, Snapshot } from './types';

export type SimStatus =
  | 'idle' | 'ready' | 'running' | 'paused' | 'finished' | 'deadlock' | 'error';

export interface SimError {
  message: string;
  line: number | null;
}

export const SPEEDS = [1200, 600, 300, 120] as const;

/**
 * Semilla nueva para una ejecucion. La elige la interfaz (el nucleo no usa azar propio) y es
 * corta a proposito: cinco cifras se pueden leer en voz alta o anotar en el pizarron para
 * que otro repita la misma ejecucion.
 */
function newSeed(): number {
  return 10000 + Math.floor(Math.random() * 90000);
}

/**
 * La simulacion del programa del editor: compilar, avanzar, pausar, repetir.
 *
 * @param code el programa abierto; quien lo cambia llama a `invalidate` (o a `reset` si
 *             abre otro programa), porque la simulacion en curso deja de corresponderle
 */
export function useSimulation(code: string) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [timeline, setTimeline] = useState<Timeline>(EMPTY_TIMELINE);
  const [status, setStatus] = useState<SimStatus>('idle');
  const [error, setError] = useState<SimError | null>(null);
  // nadie puede avanzar hasta que termine algun delay (no es un deadlock)
  const [waiting, setWaiting] = useState(false);
  // eventos del ultimo paso que hizo algo: el dibujo de los monitores resalta sus flechas
  const [entries, setEntries] = useState<readonly LogEntry[]>([]);
  // semilla de la ejecucion en curso o de la ultima: con la misma, el azar se repite igual
  const [seed, setSeed] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number>(600);
  const [policy, setPolicyState] = useState<SchedulingPolicy>('RANDOM');

  const activaRef = useRef(false);
  const statusRef = useRef<SimStatus>('idle');
  const timerRef = useRef<number | null>(null);
  // el bucle lee la politica y la velocidad en cada paso: cambiarlas no reinicia la simulacion
  const policyRef = useRef<SchedulingPolicy>('RANDOM');
  const speedRef = useRef<number>(speed);
  const seedRef = useRef<number | null>(null);
  statusRef.current = status;
  speedRef.current = speed;

  const setPolicy = useCallback((p: SchedulingPolicy) => {
    policyRef.current = p;
    setPolicyState(p);
  }, []);

  // statusRef se actualiza en el acto: el bucle lo lee antes de re-renderizar
  const setStat = (s: SimStatus) => {
    statusRef.current = s;
    setStatus(s);
  };

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
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
    setWaiting(false);
    setEntries([]);
    setStat('idle');
  }, []);

  // detiene la simulacion y devuelve el editor a modo edicion
  const stop = useCallback(() => drop(), [drop]);

  /** Editar el codigo invalida la simulacion en curso; la semilla se conserva para Repetir. */
  const invalidate = useCallback(() => {
    if (activaRef.current || statusRef.current !== 'idle') drop();
  }, [drop]);

  /** Al abrir otro programa: descarta la simulacion y tambien la semilla de la anterior. */
  const reset = useCallback(() => {
    drop();
    seedRef.current = null;
    setSeed(null);
  }, [drop]);

  /** Compila y arranca en el instante 0; con `withSeed` repite el azar de esa ejecucion. */
  const compile = useCallback((withSeed?: number): boolean => {
    clearTimer();
    setError(null);
    try {
      // con la simulacion viva y la misma semilla alcanza con reiniciarla en el nucleo
      const created = withSeed !== undefined && activaRef.current && withSeed === seedRef.current
        ? api.reset()
        : api.create(code, withSeed ?? newSeed());
      seedRef.current = created.seed;
      setSeed(created.seed);
      activaRef.current = true;
      setSnapshot(created.snapshot);
      setTimeline(startTimeline(created.snapshot));
      setWaiting(false);
      setEntries([]);
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

  /** Da un paso; con `chosenProcessId`, en ese instante avanza solo ese proceso. */
  const doStep = useCallback((chosenProcessId?: number): boolean => {
    if (!activaRef.current) return false;
    try {
      const res = api.step(policyRef.current, chosenProcessId);
      setSnapshot(res.snapshot);
      setTimeline((t) => appendInstant(t, res.snapshot, res.entries));
      setWaiting(res.waiting);
      // esperar un delay no hace nada: se sigue mostrando lo ultimo que paso
      if (res.entries.length > 0) setEntries(res.entries);
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

  /** true si no hay una simulacion que pueda avanzar: hay que compilar antes del proximo paso. */
  const needsCompile = () => statusRef.current === 'idle' || statusRef.current === 'error'
    || statusRef.current === 'finished' || statusRef.current === 'deadlock';

  /**
   * Deja la simulacion compilada en el instante 0 si todavia no hay ninguna, sin avanzar:
   * asi se conocen los procesos antes del primer paso (para elegir cual avanza).
   */
  const prepare = useCallback(() => {
    if (statusRef.current === 'idle' || statusRef.current === 'error') compile();
  }, [compile]);

  /** Avanza un instante; con `chosenProcessId`, solo se mueve ese proceso (si esta listo). */
  const step = useCallback((chosenProcessId?: number) => {
    if (needsCompile() && !compile()) return;
    clearTimer();
    setStat('paused');
    doStep(chosenProcessId);
  }, [compile, doStep]);

  const play = useCallback(() => {
    if (needsCompile() && !compile()) return;
    setStat('running');
    clearTimer();
    // Cada paso programa el siguiente al terminar (setTimeout encadenado), en vez de un
    // setInterval. Con muchos procesos un paso tarda mas que el intervalo: los disparos se
    // encolaban uno detras de otro y el navegador no llegaba a pintar ni a atender el boton
    // Pausar. Asi siempre queda la pausa completa entre un paso y el siguiente.
    const tick = () => {
      timerRef.current = null;
      if (statusRef.current !== 'running' || !doStep()) return;
      timerRef.current = window.setTimeout(tick, speedRef.current);
    };
    timerRef.current = window.setTimeout(tick, speedRef.current);
  }, [compile, doStep]);

  const pause = useCallback(() => {
    clearTimer();
    if (statusRef.current === 'running') setStat('paused');
  }, []);

  /**
   * Vuelve al instante 0 con la misma semilla: el azar toma las mismas decisiones, asi que
   * (con la misma politica de turnos) la ejecucion se repite igual. Queda en pausa para
   * recorrerla paso a paso; si estaba corriendo, sigue corriendo.
   */
  const replay = useCallback(() => {
    if (seedRef.current === null) return;
    const wasRunning = statusRef.current === 'running';
    if (!compile(seedRef.current)) return;
    if (wasRunning && statusRef.current === 'ready') play();
  }, [compile, play]);

  useEffect(() => () => clearTimer(), []);

  return {
    invalidate, reset,
    snapshot, timeline, status, error, waiting, entries, seed,
    speed, setSpeed, speeds: SPEEDS,
    policy, setPolicy,
    play, pause, step, stop, replay, prepare,
  };
}
