import { useCallback, useState } from 'react';

const STORAGE_KEY = 'simulador.editor.letra';
/** Tamanos de letra del editor, en px; el del medio es el de arranque. */
const SIZES = [11, 12, 13, 14, 16, 18, 20, 22] as const;
const DEFAULT_INDEX = 2;

function readStored(): number {
  try {
    const i = SIZES.indexOf(Number(localStorage.getItem(STORAGE_KEY)) as (typeof SIZES)[number]);
    return i < 0 ? DEFAULT_INDEX : i;
  } catch {
    return DEFAULT_INDEX;
  }
}

/** Zoom del editor de codigo: agranda o achica solo la letra del programa, no el resto. */
export function useEditorZoom() {
  const [index, setIndex] = useState(readStored);
  const move = useCallback((delta: number) => {
    setIndex((i) => {
      const next = Math.min(Math.max(i + delta, 0), SIZES.length - 1);
      try {
        localStorage.setItem(STORAGE_KEY, String(SIZES[next]));
      } catch {
        // sin almacenamiento: el zoom dura lo que dura la pestana
      }
      return next;
    });
  }, []);
  return {
    fontSize: SIZES[index],
    zoomIn: () => move(1),
    zoomOut: () => move(-1),
    canZoomIn: index < SIZES.length - 1,
    canZoomOut: index > 0,
  };
}
