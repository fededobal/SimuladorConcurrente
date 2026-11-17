import { useEffect, useRef } from 'react';
import { processTextColor } from '../processColor';
import type { OutputLine } from '../types';
import s from './Inspector.module.css';

interface Props {
  readonly lines: readonly OutputLine[];
}

/**
 * Pestana Salida: lo que va escribiendo write(). Cada linea lleva el instante y el color del
 * proceso que la escribio, que es lo que deja ver el entrelazado: con varios procesos
 * corriendo a la vez, el orden de la salida es justamente lo que cambia entre ejecuciones.
 */
export function OutputPanel({ lines }: Props) {
  const end = useRef<HTMLDivElement>(null);

  // seguir la ultima linea, como una consola
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [lines.length]);

  if (lines.length === 0) {
    return <p className="panel-vacio">Acá aparece lo que escriben los procesos con write().</p>;
  }
  return (
    <div className={s.output} role="log" aria-label="Salida del programa">
      {lines.map((l, i) => (
        <div key={i} className={s.outLine}>
          <span className={s.outInstant} title={`instante ${l.instant}`}>{l.instant}</span>
          <span className={s.outWho} style={{ color: processTextColor(l.color) }}>{l.process}</span>
          <span>{l.text}</span>
        </div>
      ))}
      <div ref={end} />
    </div>
  );
}
