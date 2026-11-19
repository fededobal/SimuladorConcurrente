import { useRef, useState } from 'react';
import { clampNameWidth } from './timelineLayout';

/** Cuanto cambia el ancho con cada flecha del teclado, en px. */
const KEY_STEP = 16;

/** Lo que devuelve el hook: el ancho vigente y las propiedades del asa que lo cambia. */
export interface NameColumn {
  readonly width: number;
  /** true mientras se arrastra el asa. */
  readonly dragging: boolean;
  readonly handleProps: React.HTMLAttributes<HTMLDivElement>;
}

/**
 * Ancho de la columna de nombres de la linea de tiempo. Arranca en el ancho automatico (el
 * que necesita el nombre mas largo) y se cambia arrastrando el borde derecho de la columna
 * o con las flechas del teclado sobre el asa; doble clic vuelve al automatico. Dura lo que
 * dura la pagina, como el tamano de los paneles.
 *
 * @param auto ancho automatico, en px
 * @param available ancho visible de la linea de tiempo, en px
 */
export function useNameColumn(auto: number, available: number): NameColumn {
  const [chosen, setChosen] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ from: number; width: number } | null>(null);
  const width = clampNameWidth(chosen ?? auto, available);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { from: e.clientX, width };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d) setChosen(clampNameWidth(d.width + e.clientX - d.from, available));
  };
  const onPointerUp = () => {
    drag.current = null;
    setDragging(false);
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    setChosen(clampNameWidth(width + (e.key === 'ArrowRight' ? KEY_STEP : -KEY_STEP), available));
  };

  const handleProps: React.HTMLAttributes<HTMLDivElement> = {
    role: 'separator',
    'aria-orientation': 'vertical',
    'aria-label': 'Cambiar el ancho de la columna de nombres',
    'aria-valuenow': width,
    title: 'Arrastrar para cambiar el ancho de los nombres (doble clic: ancho automático)',
    tabIndex: 0,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onDoubleClick: () => setChosen(null),
    onKeyDown,
    // el asa esta sobre la grilla: su clic no elige un instante
    onClick: (e) => e.stopPropagation(),
  };

  return { width, dragging, handleProps };
}
