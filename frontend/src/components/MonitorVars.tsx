import { useState } from 'react';
import { MasMenos, MAX_VISIBLES } from './MasMenos';
import type { ProcessView, VarView } from '../types';

interface Props {
  readonly vars: readonly VarView[];
  /** Procesos por id: el punto de cada variable lleva el color del ultimo que la escribio. */
  readonly processes: ReadonlyMap<number, ProcessView>;
}

/**
 * Las variables permanentes de un monitor, dibujadas segun su estructura: un escalar con su
 * valor, un arreglo como celdas con su indice, una Cola o ColaOrdenada como celdas con el
 * frente a la izquierda. El punto de color dice que proceso las escribio por ultima vez.
 */
export function MonitorVars({ vars, processes }: Props) {
  if (vars.length === 0) return null;
  return (
    <dl className="mon-datos" aria-label="Variables del monitor">
      {vars.map((v) => {
        const writer = v.lastWriterId === null ? undefined : processes.get(v.lastWriterId);
        return (
          <div key={v.name} className="mon-dato">
            <dt>
              <span className="nombre">{v.name}</span>
              <span className="tipo">{v.type}</span>
            </dt>
            <dd>
              {writer && (
                <span className="quien" style={{ background: writer.color }}
                  title={`última escritura: ${writer.name}`} />
              )}
              <Valor v={v} />
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * El valor de una variable. Un arreglo o una cola se dibuja como celdas: plegado, las
 * primeras {@link MAX_VISIBLES} y un boton para abrir el resto. El nucleo manda hasta 50
 * elementos; si hay mas, se dice cuantos faltan.
 */
function Valor({ v }: { v: VarView }) {
  const [abierta, setAbierta] = useState(false);
  if (v.elements === null) return <span className="escalar">{v.value}</span>;
  const cola = !v.isArray;
  if (v.size === 0) return <span className="nadie">{cola ? 'vacía' : 'sin elementos'}</span>;
  const visibles = abierta ? v.elements : v.elements.slice(0, MAX_VISIBLES);
  const noRecibidos = v.size - v.elements.length;
  return (
    <span className={`celdas${cola ? ' cola' : ''}`}>
      {visibles.map((e, i) => (
        <span key={i} className="celda">
          <span className="celda-valor">{e}</span>
          {/* en un arreglo cada celda lleva su indice; en una cola solo se marca el frente */}
          <span className="celda-nota">{cola ? (i === 0 ? 'frente' : ' ') : i}</span>
        </span>
      ))}
      {abierta && noRecibidos > 0 && <span className="celda-mas">… {noRecibidos} más</span>}
      {v.size > MAX_VISIBLES && (
        <span className="celda-mas">
          <MasMenos abierta={abierta} faltan={v.size - MAX_VISIBLES}
            onClick={() => setAbierta(!abierta)} />
        </span>
      )}
    </span>
  );
}
