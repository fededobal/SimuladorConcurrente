import type { StatusTone } from './components/TopBar';
import type { SimStatus } from './useSimulation';

/** Texto y tono del estado de la simulacion que muestra la barra. */
export interface StatusText {
  readonly text: string;
  readonly tone: StatusTone;
}

const LABEL: Record<SimStatus, StatusText> = {
  idle: { text: 'Sin ejecutar', tone: 'idle' },
  ready: { text: 'Listo', tone: 'pause' },
  running: { text: 'Ejecutando', tone: 'run' },
  paused: { text: 'En pausa', tone: 'pause' },
  finished: { text: 'Terminó', tone: 'ok' },
  deadlock: { text: 'Interbloqueo', tone: 'bad' },
  error: { text: 'Error', tone: 'bad' },
};

/**
 * El estado en palabras. Un interbloqueo despues de un error de ejecucion no es un problema
 * de sincronizacion del programa, y se dice distinto; lo mismo un fin con procesos que
 * fallaron, o un instante en el que solo corren los delay.
 *
 * @param waiting true si nadie puede avanzar pero hay procesos en delay
 * @param failed cantidad de procesos que terminaron por un error de ejecucion
 */
export function statusTextOf(status: SimStatus, waiting: boolean, failed: number): StatusText {
  const active = status === 'ready' || status === 'running' || status === 'paused';
  if (waiting && active) return { text: 'Esperando un delay', tone: LABEL[status].tone };
  if (failed > 0) {
    if (status === 'deadlock') return { text: 'Interbloqueo tras un error', tone: 'bad' };
    if (status === 'finished') return { text: 'Fin con errores', tone: 'bad' };
    return { text: LABEL[status].text, tone: 'bad' };
  }
  return LABEL[status];
}
