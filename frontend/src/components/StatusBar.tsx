import { Check, TriangleAlert } from 'lucide-react';
import type { CursorPosition } from './CodeEditor';
import { SHORTCUTS } from '../shortcuts';
import type { SchedulingPolicy } from '../types';
import type { SaveState } from '../useProgram';
import s from './StatusBar.module.css';

interface Props {
  readonly cursor: CursorPosition;
  /** Cantidad de procesos y monitores de la simulacion, o null si todavia no hay ninguna. */
  readonly counts: { readonly processes: number; readonly monitors: number } | null;
  readonly policy: SchedulingPolicy;
  readonly seed: number | null;
  readonly saveState: SaveState;
  /** true si el programa esta en "Mis programas" (y no solo como borrador). */
  readonly inLibrary: boolean;
  /** true si la simulacion esta corriendo: F5 la pausa en vez de ejecutarla. */
  readonly running: boolean;
  readonly onShowShortcuts: () => void;
}

const POLICY_TEXT: Record<SchedulingPolicy, string> = {
  RANDOM: 'Turnos al azar',
  ROUND_ROBIN: 'Turnos en ronda',
};

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Barra de estado. A la izquierda lo que describe la sesion (cursor, tamano del programa en
 * ejecucion, turnos, semilla, guardado); a la derecha los atajos, para que no haya que
 * memorizarlos.
 */
export function StatusBar({
  cursor, counts, policy, seed, saveState, inLibrary, running, onShowShortcuts,
}: Props) {
  return (
    <footer className={s.bar}>
      <span className={`${s.item} ${s.mono}`} title="Posición del cursor en el código">
        Ln {cursor.line}, Col {cursor.column}
      </span>
      {counts && (
        <span className={`${s.item} ${s.optional}`}>
          {plural(counts.processes, 'proceso', 'procesos')} · {plural(counts.monitors, 'monitor', 'monitores')}
        </span>
      )}
      <span className={s.item}
        title="Con la misma semilla y la misma política de turnos, la ejecución se repite igual">
        {POLICY_TEXT[policy]}
        {seed !== null && <> · semilla <b className={s.mono}>{seed}</b></>}
      </span>
      <span className={`${s.item} ${saveState === 'unavailable' ? s.unsaved : s.saved}`} role="status">
        {saveState === 'unavailable' ? (
          <><TriangleAlert size={12} /> No se pudo guardar en este navegador</>
        ) : saveState === 'saving' ? (
          <>Guardando…</>
        ) : (
          <><Check size={12} /> {inLibrary ? 'Guardado en Mis programas' : 'Guardado en este navegador'}</>
        )}
      </span>

      <span className={s.spacer} />

      {SHORTCUTS.filter((k) => k.action !== 'help').map((k) => (
        <span key={k.action} className={`${s.shortcut} ${s.optional}`}>
          <kbd>{k.keys}</kbd>
          {k.action === 'toggle-run' ? (running ? 'Pausar' : 'Ejecutar') : k.label}
        </span>
      ))}
      <button type="button" className={s.help} onClick={onShowShortcuts}>
        <kbd>?</kbd> Todos los atajos
      </button>
    </footer>
  );
}
