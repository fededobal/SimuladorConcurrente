import { ChevronDown } from 'lucide-react';
import { IndexedName } from './IndexedName';
import { Popover } from './Popover';
import { STATE_LABEL, visibleState } from '../processStates';
import { processTextColor } from '../processColor';
import type { ProcessView } from '../types';

interface Props {
  /** Procesos del snapshot actual; vacio si todavia no hay simulacion. */
  readonly processes: readonly ProcessView[];
  readonly disabled: boolean;
  /** Clases del boton que abre el menu. */
  readonly className?: string;
  /** Compila el programa si todavia no hay simulacion, para tener procesos que listar. */
  readonly onOpen: () => void;
  /** Avanza un instante en el que solo se mueve el proceso elegido. */
  readonly onStep: (processId: number) => void;
}

/** true si el proceso puede avanzar en el proximo instante. */
function canAdvance(p: ProcessView): boolean {
  return p.state === 'READY' || p.state === 'RUNNING';
}

/**
 * Menu pegado al boton Paso: elige que proceso avanza en el proximo instante, en vez de
 * dejarlo al azar o a la ronda. Sirve para armar a mano un entrelazado puntual ("que primero
 * entre el Consumidor"). Solo se pueden elegir los procesos que estan listos.
 */
export function StepMenu({ processes, disabled, className = 'btn', onOpen, onStep }: Props) {
  return (
    <Popover
      className={className}
      label={<ChevronDown size={14} />}
      ariaLabel="Avanzar un proceso elegido"
      title="Elegir qué proceso avanza en el próximo instante"
      disabled={disabled}
      onOpen={onOpen}
    >
      {() => (
        <div className="menu" role="menu" aria-label="Avanzar un proceso elegido">
          <p className="menu-titulo">Avanzar un instante solo con…</p>
          {processes.length === 0 && (
            <p className="menu-vacio">El programa no tiene procesos para avanzar.</p>
          )}
          {/* el menu queda abierto: se suele dar varios pasos seguidos eligiendo cada vez */}
          {processes.map((p) => (
            <button key={p.id} type="button" role="menuitem" className="menu-item"
              disabled={!canAdvance(p)} onClick={() => onStep(p.id)}>
              <i className="punto" style={{ background: p.color }} />
              <span className="menu-item-nombre menu-item-largo" style={{ color: processTextColor(p.color) }}>
                <IndexedName name={p.name} />
              </span>
              <span className="menu-item-nota">
                {canAdvance(p) ? (p.line > 0 ? `línea ${p.line}` : 'listo') : STATE_LABEL[visibleState(p)]}
              </span>
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}
