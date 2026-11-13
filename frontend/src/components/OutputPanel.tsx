import { useEffect, useRef } from 'react';
import { ExpandButton } from './ExpandButton';
import type { OutputLine } from '../types';

interface Props {
  readonly lines: readonly OutputLine[];
  readonly expanded: boolean;
  readonly onToggleExpand: () => void;
}

/**
 * Pantalla de salida: lo que va escribiendo write(). Cada linea lleva el color del proceso
 * que la escribio, que es lo que deja ver el entrelazado — con varios procesos corriendo a
 * la vez, el orden de la salida es justamente lo que cambia entre corridas.
 */
export function OutputPanel({ lines, expanded, onToggleExpand }: Props) {
  const fin = useRef<HTMLDivElement>(null);

  // seguir la ultima linea, como una consola
  useEffect(() => {
    fin.current?.scrollIntoView({ block: 'end' });
  }, [lines.length]);

  return (
    <aside className="salida tarjeta" aria-label="Salida">
      <header className="panel-head">
        <span className="titulo">Salida</span>
        {lines.length > 0 && <span className="cuenta">{lines.length}</span>}
        <ExpandButton expanded={expanded} onClick={onToggleExpand} />
      </header>
      <div className="lineas">
        {lines.length === 0 ? (
          <p className="vacio">Acá aparece lo que escriben los procesos con write().</p>
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
