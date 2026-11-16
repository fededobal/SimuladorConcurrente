import { useCallback, useState } from 'react';

/** Tema de la interfaz: los colores de cada uno estan en index.css, bajo `data-theme`. */
export type Theme = 'light' | 'dark';

/**
 * La clave con que VitePress guarda el tema de la documentacion: la comparten, asi elegir el
 * tema en uno lo cambia en el otro. VitePress guarda 'light', 'dark' o 'auto' (seguir al
 * sistema). La lee tambien el guion de index.html, que pinta el tema antes que React.
 */
const STORAGE_KEY = 'vitepress-theme-appearance';

/** El tema que dejo puesto index.html al cargar: lo elegido antes o, si no hay, el del sistema. */
function readApplied(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/**
 * Tema claro u oscuro. La primera vez sigue al sistema operativo; desde que el alumno lo
 * cambia, queda guardado en el navegador.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readApplied);
  const toggle = useCallback(() => {
    setTheme((actual) => {
      const next: Theme = actual === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // sin almacenamiento: el tema elegido dura lo que dura la pestana
      }
      return next;
    });
  }, []);
  return { theme, toggle };
}
