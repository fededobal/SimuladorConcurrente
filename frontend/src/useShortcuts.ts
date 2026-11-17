import { useEffect, useRef } from 'react';
import { shortcutOf, type ShortcutAction } from './shortcuts';

/** true si el foco esta en un lugar donde se escribe texto. */
function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement
    || (target instanceof HTMLElement && target.isContentEditable);
}

/**
 * Escucha los atajos de teclado en toda la ventana y llama a `onAction`. F5 deja de recargar
 * la pestana (pasa a ejecutar): con el guardado automatico, recargar ya no hace falta para
 * nada y el atajo es el de cualquier depurador.
 */
export function useShortcuts(onAction: (action: ShortcutAction) => void): void {
  // siempre la ultima funcion, sin volver a registrar el listener en cada render
  const handler = useRef(onAction);
  handler.current = onAction;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const action = shortcutOf(e, isTyping(e.target));
      if (action === null) return;
      e.preventDefault();
      // con la tecla apretada no se repite: un F10 sostenido no dispara una rafaga de pasos
      if (!e.repeat) handler.current(action);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
