import { useCallback, useRef, useState } from 'react';

/** Alto minimo: el encabezado, la regla y una fila. */
const MIN_HEIGHT = 80;
/** Espacio que siempre le queda arriba al resto de la pantalla (barra y algo de editor). */
const ROOM_ABOVE = 160;
/** Cuanto cambia el alto con cada flecha del teclado. */
const KEY_STEP = 24;

function clamp(h: number): number {
  return Math.round(Math.min(Math.max(h, MIN_HEIGHT), window.innerHeight - ROOM_ABOVE));
}

// Recordar el alto es una comodidad de quien mira: si el navegador no deja guardar (ventana
// privada, almacenamiento bloqueado), el panel arranca con su alto automatico y listo.
function readStored(key: string): number | null {
  try {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

function store(key: string, h: number | null) {
  try {
    if (h === null) localStorage.removeItem(key);
    else localStorage.setItem(key, String(h));
  } catch {
    // sin almacenamiento: el alto dura lo que dura la pestana
  }
}

/**
 * Alto de un panel que se agranda o achica arrastrando su borde superior. Devuelve el alto
 * (null mientras no se lo haya tocado: el panel usa su alto automatico) y las props del asa.
 * Doble clic en el asa vuelve al alto automatico.
 */
export function useDragHeight(storageKey: string) {
  const [height, setHeight] = useState<number | null>(() => {
    const h = readStored(storageKey);
    return h === null ? null : clamp(h);
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; h: number; last: number | null } | null>(null);

  const apply = useCallback((h: number | null) => {
    const next = h === null ? null : clamp(h);
    setHeight(next);
    store(storageKey, next);
  }, [storageKey]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    if (!panel || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, h: panel.getBoundingClientRect().height, last: null };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    // el borde esta arriba: subir el puntero agranda el panel
    d.last = clamp(d.h + d.y - e.clientY);
    setHeight(d.last);
  };
  // se guarda al soltar, no en cada movimiento
  const onPointerUp = () => {
    if (drag.current?.last != null) store(storageKey, drag.current.last);
    drag.current = null;
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const actual = height ?? panelRef.current?.getBoundingClientRect().height ?? MIN_HEIGHT;
    if (e.key === 'ArrowUp') { e.preventDefault(); apply(actual + KEY_STEP); }
    if (e.key === 'ArrowDown') { e.preventDefault(); apply(actual - KEY_STEP); }
  };

  const handleProps = {
    role: 'separator',
    'aria-orientation': 'horizontal' as const,
    'aria-label': 'Cambiar el alto del panel de abajo',
    title: 'Arrastrar para cambiar el alto (doble clic: alto automático)',
    tabIndex: 0,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onDoubleClick: () => apply(null),
    onKeyDown,
  };

  return { height, panelRef, handleProps };
}
