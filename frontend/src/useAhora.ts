import { useEffect, useState } from 'react';

/**
 * La hora actual (como Date.now()), refrescada varias veces por segundo mientras `activo`:
 * el contador de un delay baja en tiempo real aunque la simulacion este en pausa.
 */
export function useAhora(activo: boolean): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!activo) return;
    setAhora(Date.now());
    const id = window.setInterval(() => setAhora(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [activo]);
  return ahora;
}

/** Segundos que le faltan a un delay, redondeados hacia arriba (nunca negativos). */
export function segundosRestantes(fin: number, ahora: number): number {
  return Math.max(0, Math.ceil((fin - ahora) / 1000));
}
