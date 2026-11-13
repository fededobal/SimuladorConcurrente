import { useCallback, useRef, useState } from 'react';

/** Eje del arrastre: 'y' cambia el alto (borde de arriba), 'x' el ancho (borde izquierdo). */
export type DragAxis = 'x' | 'y';

/** Tamano minimo de un panel: el encabezado, la regla y una fila; o un nombre de proceso. */
const MIN_SIZE: Record<DragAxis, number> = { y: 80, x: 180 };
/** Espacio que siempre le queda al resto de la pantalla (la barra y algo de editor). */
const ROOM: Record<DragAxis, number> = { y: 160, x: 360 };
/** Cuanto cambia el tamano con cada flecha del teclado. */
const KEY_STEP = 24;

function clamp(axis: DragAxis, size: number): number {
  const total = axis === 'y' ? window.innerHeight : window.innerWidth;
  return Math.round(Math.min(Math.max(size, MIN_SIZE[axis]), total - ROOM[axis]));
}

/** Lo que devuelve el hook: lo consume `Dock`, que dibuja el panel y su asa. */
export interface DragSize {
  readonly axis: DragAxis;
  /** Alto o ancho elegido, o null mientras no se lo haya tocado (tamano automatico). */
  readonly size: number | null;
  readonly panelRef: React.RefObject<HTMLDivElement | null>;
  readonly handleProps: React.HTMLAttributes<HTMLDivElement>;
}

/**
 * Tamano de un panel que se agranda o achica arrastrando el borde que mira al editor: el
 * de arriba si cambia el alto, el izquierdo si cambia el ancho. Tambien con las flechas del
 * teclado sobre el asa. Doble clic en el asa vuelve al tamano automatico. El tamano dura lo
 * que dura la pagina: al recargar, cada panel vuelve a su lugar y tamano iniciales.
 */
export function useDragSize(axis: DragAxis, label: string): DragSize {
  const [size, setSize] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ from: number; size: number } | null>(null);

  const apply = useCallback((s: number | null) => {
    setSize(s === null ? null : clamp(axis, s));
  }, [axis]);

  const measure = () => {
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return MIN_SIZE[axis];
    return axis === 'y' ? rect.height : rect.width;
  };
  const pointerAt = (e: React.PointerEvent) => (axis === 'y' ? e.clientY : e.clientX);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!panelRef.current || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { from: pointerAt(e), size: measure() };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    // el borde esta del lado del editor: alejar el puntero del panel lo agranda
    setSize(clamp(axis, d.size + d.from - pointerAt(e)));
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const actual = size ?? measure();
    const grow = axis === 'y' ? 'ArrowUp' : 'ArrowLeft';
    const shrink = axis === 'y' ? 'ArrowDown' : 'ArrowRight';
    if (e.key === grow) { e.preventDefault(); apply(actual + KEY_STEP); }
    if (e.key === shrink) { e.preventDefault(); apply(actual - KEY_STEP); }
  };

  const handleProps: React.HTMLAttributes<HTMLDivElement> = {
    role: 'separator',
    'aria-orientation': axis === 'y' ? 'horizontal' : 'vertical',
    'aria-label': label,
    title: `Arrastrar para ${label.toLowerCase()} (doble clic: tamaño automático)`,
    tabIndex: 0,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onDoubleClick: () => apply(null),
    onKeyDown,
  };

  return { axis, size, panelRef, handleProps };
}
