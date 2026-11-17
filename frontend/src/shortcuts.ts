// Atajos de teclado de la simulacion. Son los de los depuradores que los alumnos ya usan
// (F5 ejecutar, F10 paso, Shift+F5 detener).

/** Accion que dispara un atajo. */
export type ShortcutAction = 'toggle-run' | 'step' | 'stop' | 'help';

/** Un atajo, con el texto para la barra de estado y la lista de atajos. */
export interface Shortcut {
  readonly action: ShortcutAction;
  /** Teclas tal como se muestran: "F5", "Shift F5". */
  readonly keys: string;
  readonly label: string;
}

export const SHORTCUTS: readonly Shortcut[] = [
  { action: 'toggle-run', keys: 'F5', label: 'Ejecutar o pausar' },
  { action: 'step', keys: 'F10', label: 'Paso' },
  { action: 'stop', keys: 'Shift F5', label: 'Detener' },
  { action: 'help', keys: '?', label: 'Todos los atajos' },
];

/** Lo que se mira de un evento de teclado (un KeyboardEvent lo cumple). */
export interface KeyPress {
  readonly key: string;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
}

/**
 * La accion de una tecla, o null si no es un atajo.
 *
 * @param typing true si el foco esta en un campo de texto: ahi "?" se escribe, no abre la ayuda
 */
export function shortcutOf(e: KeyPress, typing: boolean): ShortcutAction | null {
  // Ctrl/Cmd + F5 es "recargar sin cache" del navegador: no se toca
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  if (e.key === 'F5') return e.shiftKey ? 'stop' : 'toggle-run';
  if (e.key === 'F10' && !e.shiftKey) return 'step';
  if (e.key === '?' && !typing) return 'help';
  return null;
}
