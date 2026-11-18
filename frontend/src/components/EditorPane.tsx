import { ZoomIn, ZoomOut } from 'lucide-react';
import { CodeEditor, type CursorPosition } from './CodeEditor';
import { ConstantsMenu } from './ConstantsMenu';
import { DeadlockBanner } from './DeadlockBanner';
import type { BlockedProcess } from '../deadlock';
import type { ActiveLine } from '../editor/lineMarks';
import { processTextColor } from '../processColor';
import { fileNameOf } from '../programs';
import { familyOf } from '../timeline';
import type { ProcessView } from '../types';
import type { EditorZoom } from '../useEditorZoom';
import type { DeadlockInfo, SimError } from '../useSimulation';
import s from './EditorPane.module.css';

interface Props {
  readonly programName: string;
  /** true mientras hay cambios sin guardar todavia (el guardado es automatico). */
  readonly saving: boolean;
  readonly code: string;
  readonly onChange: (code: string) => void;
  readonly readOnly: boolean;
  readonly activeLines: readonly ActiveLine[];
  readonly errorLines: readonly number[];
  readonly pasoMs: number;
  /** Instante de la simulacion; 0 si no hay una. */
  readonly instant: number;
  readonly zoom: EditorZoom;
  readonly onCursor: (position: CursorPosition) => void;
  /** Procesos de la simulacion, para la leyenda del encabezado. */
  readonly processes: readonly ProcessView[];
  /** Error de compilacion, si el programa no arranco. */
  readonly compileError: SimError | null;
  /** Procesos que terminaron por un error de ejecucion. */
  readonly failed: readonly ProcessView[];
  readonly deadlock: DeadlockInfo | null;
  readonly blocked: readonly BlockedProcess[];
  readonly onShowInstant: (instant: number) => void;
  readonly onReplay: () => void;
}

/** Familias de procesos que entran en la leyenda del encabezado. */
const MAX_LEGEND = 4;

/**
 * Una entrada por proceso suelto o por familia ("Cliente" para Cliente[0..9]): es lo que
 * identifica la inicial del margen del editor.
 */
function legendOf(processes: readonly ProcessView[]): { name: string; color: string; count: number }[] {
  const families = new Map<string, { name: string; color: string; count: number }>();
  for (const p of processes) {
    const name = familyOf(p.name);
    const family = families.get(name);
    if (family) family.count++;
    else families.set(name, { name, color: p.color, count: 1 });
  }
  return [...families.values()];
}

/**
 * Columna del editor. El encabezado muestra el programa como un archivo abierto, la leyenda
 * de los procesos, las constantes del programa y el zoom; debajo, el cartel de deadlock cuando corresponde, el codigo
 * y los errores.
 */
export function EditorPane(p: Props) {
  const legend = legendOf(p.processes);
  return (
    <section className={s.pane} aria-label="Editor">
      <header className={s.head}>
        <div className={s.file} title={p.saving ? 'Guardando los cambios…' : 'Los cambios se guardan solos'}>
          <span className={`${s.fileDot}${p.saving ? ` ${s.saving}` : ''}`} aria-hidden="true" />
          <span className={s.fileName}>{fileNameOf(p.programName)}</span>
        </div>
        <div className={s.end}>
          <ul className={s.legend} aria-label="Procesos">
            {legend.slice(0, MAX_LEGEND).map((f) => (
              <li key={f.name}>
                <span className={s.initial} style={{ background: f.color }} aria-hidden="true">
                  {f.name.charAt(0).toUpperCase()}
                </span>
                {f.name}{f.count > 1 && ` ×${f.count}`}
              </li>
            ))}
            {legend.length > MAX_LEGEND && <li>+{legend.length - MAX_LEGEND}</li>}
          </ul>
          <ConstantsMenu code={p.code} onChange={p.onChange} disabled={p.readOnly} />
          <button type="button" className="btn btn-icono btn-plano btn-chico" onClick={p.zoom.zoomOut}
            disabled={!p.zoom.canZoomOut} aria-label="Achicar la letra del código" title="Achicar la letra del código">
            <ZoomOut size={14} />
          </button>
          <button type="button" className="btn btn-icono btn-plano btn-chico" onClick={p.zoom.zoomIn}
            disabled={!p.zoom.canZoomIn} aria-label="Agrandar la letra del código" title="Agrandar la letra del código">
            <ZoomIn size={14} />
          </button>
        </div>
      </header>

      {p.deadlock && (
        <DeadlockBanner
          instant={p.deadlock.instant}
          blocked={p.blocked}
          engineMessage={p.deadlock.message}
          afterError={p.failed.length > 0}
          onShowInstant={() => p.onShowInstant(p.deadlock?.instant ?? 0)}
          onReplay={p.onReplay}
        />
      )}

      <CodeEditor
        code={p.code}
        onChange={p.onChange}
        readOnly={p.readOnly}
        activeLines={p.activeLines}
        errorLines={p.errorLines}
        pasoMs={p.pasoMs}
        instant={p.instant}
        fontSize={p.zoom.fontSize}
        onCursor={p.onCursor}
      />

      {p.compileError && (
        <div className={s.err} role="alert">
          {p.compileError.line != null ? `línea ${p.compileError.line}: ` : ''}
          {p.compileError.message.replace(/^L[ií]nea \d+:\s*/, '')}
        </div>
      )}
      {!p.compileError && p.failed.length > 0 && (
        <div className={s.err} role="alert">
          {p.failed.map((f) => (
            <div key={f.id}>
              <span style={{ color: processTextColor(f.color) }}>{f.name}</span>
              {f.line > 0 ? `, línea ${f.line}` : ''}: error de ejecución: {f.error}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
