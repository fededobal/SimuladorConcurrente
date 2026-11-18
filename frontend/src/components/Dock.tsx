import type { ReactNode } from 'react';
import type { DragSize } from '../useDragSize';
import s from './Dock.module.css';

interface Props {
  readonly drag: DragSize;
  /** Clase que da el tamano por defecto del panel. */
  readonly className: string;
  /** Tamano sugerido (px) mientras no se lo arrastro; sin el, manda el de la clase. */
  readonly autoSize?: number;
  readonly children: ReactNode;
}

/**
 * Envoltorio de un panel con asa de arrastre en el borde que mira al editor. Mientras no
 * se lo arrastro, el tamano lo da el CSS (o `autoSize`) y cambia con una transicion; despues
 * manda el elegido, sin transicion, para que siga al puntero.
 */
export function Dock({ drag, className, autoSize, children }: Props) {
  const style = drag.size !== null
    ? (drag.axis === 'y' ? { height: drag.size, maxHeight: 'none' } : { width: drag.size })
    : autoSize === undefined ? undefined
      : drag.axis === 'y' ? { height: autoSize } : { width: autoSize };
  return (
    <div ref={drag.panelRef} className={`${s.dock} ${className}${drag.size === null ? ` ${s.auto}` : ''}`}
      style={style}>
      <div className={`${s.asa} ${drag.axis === 'y' ? s.asaY : s.asaX}`} {...drag.handleProps} />
      {children}
    </div>
  );
}
