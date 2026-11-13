import type { ReactNode } from 'react';
import type { DragSize } from '../useDragSize';

interface Props {
  readonly drag: DragSize;
  /** Clase que da el tamano por defecto del panel (dock-salida, dock-monitores...). */
  readonly className: string;
  readonly children: ReactNode;
}

/**
 * Envoltorio de un panel con asa de arrastre en el borde que mira al editor. Mientras no
 * se lo arrastro, el tamano lo da el CSS; despues manda el elegido.
 */
export function Dock({ drag, className, children }: Props) {
  const style = drag.size === null ? undefined
    : drag.axis === 'y' ? { height: drag.size, maxHeight: 'none' } : { width: drag.size };
  return (
    <div ref={drag.panelRef} className={`dock ${className}`} style={style}>
      <div className={`asa asa-${drag.axis}`} {...drag.handleProps} />
      {children}
    </div>
  );
}
