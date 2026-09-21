import { useEffect, useRef } from 'react';
import type { OutputLine } from '../types';

interface Props {
  lines: OutputLine[];
}

/**
 * Pantalla de salida: lo que va escribiendo write(). Cada linea lleva el color del proceso
 * que la escribio, que es lo que deja ver el entrelazado — con varios procesos corriendo a
 * la vez, el orden de la salida es justamente lo que cambia entre corridas.
 */
export function OutputPanel({ lines }: Props) {
  const fin = useRef<HTMLDivElement>(null);

  // seguir la ultima linea, como una consola
  useEffect(() => {
    fin.current?.scrollIntoView({ block: 'end' });
  }, [lines.length]);

  return (
    <aside className="salida">
      <header>
        salida
        {lines.length > 0 && <span className="cuenta">{lines.length}</span>}
      </header>
      <div className="lineas">
        {lines.length === 0 ? (
          <p className="vacio" />
        ) : (
          lines.map((l, i) => (
            <div key={i} className="linea">
              <span className="t">{l.instant}</span>
              <span className="quien" style={{ color: l.color }}>{l.process}</span>
              <span className="texto">{l.text}</span>
            </div>
          ))
        )}
        <div ref={fin} />
      </div>
    </aside>
  );
}
