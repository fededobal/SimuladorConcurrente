import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen, Moon, Play, Pause, RotateCcw, SkipForward, Square, Sun, Terminal, ZoomIn, ZoomOut,
} from 'lucide-react';
import { CodeEditor } from './components/CodeEditor';
import type { ActiveLine } from './editor/lineMarks';
import { Dock } from './components/Dock';
import { ProgramMenu } from './components/ProgramMenu';
import { StepMenu } from './components/StepMenu';
import { OutputPanel } from './components/OutputPanel';
import { MonitorPanel } from './components/MonitorPanel';
import { useSimulation, type SimStatus } from './useSimulation';
import { EJEMPLOS } from './ejemplos';
import { downloadText, readTextFile } from './files';
import { DEFAULT_NAME, fileNameOf, nameFromFile, type Program, type SavedProgram } from './programs';
import { useProgram } from './useProgram';
import { Timeline } from './components/Timeline';
import { visibleState, whereOf } from './processStates';
import { useDragSize } from './useDragSize';
import { useEditorZoom } from './useEditorZoom';
import { useTheme } from './useTheme';
import { processTextColor } from './processColor';
import type { SchedulingPolicy } from './types';

/** Paneles que se pueden ampliar al costado del editor (el editor siempre queda a la vista). */
type PanelId = 'output' | 'timeline' | 'monitors';

const SPEED_LABEL: Record<number, string> = {
  1200: 'lento',
  600: 'normal',
  300: 'rápido',
  120: 'muy rápido',
};

const POLICY_LABEL: Record<SchedulingPolicy, string> = {
  RANDOM: 'al azar',
  ROUND_ROBIN: 'en ronda',
};

const STATUS_LABEL: Record<SimStatus, string> = {
  idle: '',
  ready: 'listo',
  running: 'ejecutando',
  paused: 'en pausa',
  finished: 'fin',
  deadlock: 'deadlock',
  error: 'error',
};

/** Programa con el que arranca quien entra por primera vez: el primer ejemplo. */
const FIRST_PROGRAM: Program = {
  id: null,
  name: EJEMPLOS[0]?.titulo ?? DEFAULT_NAME,
  code: EJEMPLOS[0]?.codigo ?? '',
};

/** Cuanto queda en pantalla un aviso corto, en ms. */
const NOTICE_MS = 4000;

export function App() {
  const store = useProgram(FIRST_PROGRAM);
  const { program } = store;
  const sim = useSimulation(program.code);
  const { snapshot, status } = sim;

  // aviso corto abajo a la derecha (archivo que no se pudo abrir, enlace copiado)
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (notice === null) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const zoom = useEditorZoom();
  const tema = useTheme();
  const otroTema = tema.theme === 'dark' ? 'claro' : 'oscuro';

  // Cada panel se agranda o achica arrastrando el borde que mira al editor.
  const abajo = useDragSize('y', 'Cambiar el alto de la línea de tiempo');
  const monitores = useDragSize('x', 'Cambiar el ancho de los monitores');
  const ampliado = useDragSize('x', 'Cambiar el ancho del panel ampliado');

  // Un panel ampliado ocupa la derecha a toda altura y los demas se ocultan hasta cerrarlo.
  // La salida no tiene lugar fijo: se abre asi, desde el boton de la barra.
  const [expanded, setExpanded] = useState<PanelId | null>(null);
  useEffect(() => {
    if (expanded === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);
  const toggle = (id: PanelId) => () => setExpanded((actual) => (actual === id ? null : id));

  const activeLines: ActiveLine[] = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.processes
      .filter((p) => p.line > 0 && p.state !== 'TERMINATED')
      .map((p) => {
        const state = visibleState(p);
        return {
          line: p.line, color: p.color, state, name: p.name, where: whereOf(p, state),
          delayEndsAt: p.delayEndsAt,
        };
      });
  }, [snapshot]);

  // Procesos que terminaron por un error de ejecucion: se muestran con su linea.
  const fallidos = useMemo(
    () => snapshot?.processes.filter((p) => p.error !== null) ?? [],
    [snapshot],
  );
  const errorLines = useMemo(() => {
    if (status === 'error') return sim.error?.line != null ? [sim.error.line] : [];
    return fallidos.filter((p) => p.line > 0).map((p) => p.line);
  }, [status, sim.error, fallidos]);

  const running = status === 'running';
  // solo se puede detener una simulacion que todavia puede avanzar
  const active = status === 'ready' || status === 'running' || status === 'paused';
  // un interbloqueo despues de un error no es un problema de sincronizacion del programa
  const etiqueta = sim.waiting && active ? 'esperando que termine un delay'
    : fallidos.length === 0 ? STATUS_LABEL[status]
    : status === 'deadlock' ? 'deadlock tras un error'
      : status === 'finished' ? 'fin con errores' : STATUS_LABEL[status];
  const mal = status === 'deadlock' || status === 'error' || fallidos.length > 0;

  const changeCode = (code: string) => {
    store.setCode(code);
    sim.invalidate();
  };

  /**
   * Abre otro programa en el editor. Si el actual es trabajo propio que no esta en "Mis
   * programas", avisa antes de pisarlo: el guardado automatico solo conserva el abierto.
   */
  const openProgram = (next: Program) => {
    const ownWork = program.id === null && program.code.trim() !== ''
      && !EJEMPLOS.some((e) => e.codigo === program.code);
    if (ownWork && !window.confirm(
      `"${program.name}" no está en Mis programas y se va a reemplazar. ¿Seguir?`,
    )) return;
    store.open(next);
    sim.reset();
  };

  const openFile = async (file: File) => {
    try {
      openProgram({ id: null, name: nameFromFile(file.name), code: await readTextFile(file) });
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'No se pudo abrir el archivo.');
    }
  };

  const removeSaved = (p: SavedProgram) => {
    if (window.confirm(`¿Borrar "${p.name}" de Mis programas? No se puede deshacer.`)) {
      store.removeFromLibrary(p.id);
    }
  };

  const panel = (id: PanelId) => {
    const props = { expanded: expanded === id, onToggleExpand: toggle(id) };
    switch (id) {
      case 'output': return <OutputPanel lines={snapshot?.output ?? []} {...props} />;
      case 'timeline':
        return <Timeline timeline={sim.timeline} processes={snapshot?.processes ?? []} {...props} />;
      case 'monitors': return <MonitorPanel snapshot={snapshot} entries={sim.entries} {...props} />;
    }
  };

  return (
    <div className="app">
      <div className="bar tarjeta">
        {running ? (
          <button className="btn btn-main" onClick={sim.pause} title="Pausar la simulación">
            <Pause size={14} /> Pausar
          </button>
        ) : (
          <button className="btn btn-main" onClick={sim.play}
            title="Ejecutar la simulación: avanza sola, un instante por vez">
            <Play size={14} /> Ejecutar
          </button>
        )}

        <div className="grupo">
          <button className="btn" onClick={() => sim.step()} disabled={running}
            title="Avanzar un solo instante">
            <SkipForward size={14} /> Paso
          </button>
          <StepMenu processes={snapshot?.processes ?? []} disabled={running}
            onOpen={sim.prepare} onStep={sim.step} />
        </div>

        <button className="btn" onClick={sim.stop} disabled={!active}
          title="Detener y volver al principio del programa">
          <Square size={14} /> Detener
        </button>

        <button className="btn btn-icono" onClick={sim.replay} disabled={sim.seed === null}
          aria-label="Repetir la ejecución con la misma semilla"
          title={sim.seed === null ? 'Repetir: todavía no hay una ejecución para repetir'
            : `Repetir la misma ejecución desde el instante 0 (semilla ${sim.seed})`}>
          <RotateCcw size={14} />
        </button>

        <span className="bar-sep" aria-hidden="true" />

        <label className="campo" title="Cuánto dura cada instante en pantalla">
          <span>velocidad</span>
          <select
            className="sel"
            value={sim.speed}
            onChange={(e) => sim.setSpeed(Number(e.target.value))}
          >
            {sim.speeds.map((s) => (
              <option key={s} value={s}>{SPEED_LABEL[s] ?? `${s}ms`}</option>
            ))}
          </select>
        </label>

        <label
          className="campo"
          title="Al azar: en cada instante avanza un subconjunto aleatorio de los procesos listos. En ronda: avanzan todos los listos, por turno."
        >
          <span>turnos</span>
          <select
            className="sel"
            value={sim.policy}
            onChange={(e) => sim.setPolicy(e.target.value as SchedulingPolicy)}
          >
            {(Object.keys(POLICY_LABEL) as SchedulingPolicy[]).map((p) => (
              <option key={p} value={p}>{POLICY_LABEL[p]}</option>
            ))}
          </select>
        </label>

        <ProgramMenu
          program={program}
          library={store.library}
          examples={EJEMPLOS}
          disabled={running}
          onRename={store.rename}
          onNew={() => openProgram({ id: null, name: DEFAULT_NAME, code: '' })}
          onOpen={openProgram}
          onOpenFile={openFile}
          onDownload={() => downloadText(fileNameOf(program.name), program.code)}
          onSave={store.saveToLibrary}
          onRemove={removeSaved}
        />

        <div className="spacer" />

        <button
          className="btn"
          onClick={toggle('output')}
          aria-pressed={expanded === 'output'}
          title="Ver lo que escriben los procesos con write()"
        >
          <Terminal size={14} /> Salida
          {(snapshot?.output.length ?? 0) > 0 && (
            <span className="cuenta">{snapshot?.output.length}</span>
          )}
        </button>

        {/* el sitio de documentación se publica junto con la aplicación, bajo /docs/ */}
        <a className="btn btn-enlace" href="/docs/" title="Documentación: teoría, lenguaje y uso del simulador">
          <BookOpen size={14} /> Documentación
        </a>

        {/* el icono muestra el tema al que se pasa, no el actual */}
        <button className="btn btn-icono" onClick={tema.toggle}
          aria-label={`Pasar al tema ${otroTema}`} title={`Pasar al tema ${otroTema}`}>
          {tema.theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* aria-live: un lector de pantalla anuncia el cambio de estado (pausa, fin, interbloqueo) */}
        <div className="meta">
          <span className={`st${mal ? ' bad' : ''}`} role="status" aria-live="polite">{etiqueta}</span>
          <span className="rotulo">instante</span>
          <span className="n">{snapshot?.instant ?? 0}</span>
          {sim.seed !== null && (
            <span className="semilla"
              title="Semilla del azar de esta ejecución: con la misma semilla y la misma política de turnos, la ejecución se repite igual">
              <span className="rotulo">semilla</span> {sim.seed}
            </span>
          )}
        </div>
      </div>

      <div className="cuerpo">
        <div className="columna">
          <div className="stage tarjeta">
            {/* el zoom va sobre el editor, que es lo que agranda; en la barra quedaba lejos */}
            <div className="editor-zoom" role="group" aria-label="Tamaño de letra del código">
              <button className="amp" onClick={zoom.zoomOut} disabled={!zoom.canZoomOut}
                aria-label="Achicar la letra del código" title="Achicar la letra del código">
                <ZoomOut size={14} />
              </button>
              <button className="amp" onClick={zoom.zoomIn} disabled={!zoom.canZoomIn}
                aria-label="Agrandar la letra del código" title="Agrandar la letra del código">
                <ZoomIn size={14} />
              </button>
            </div>
            <CodeEditor
              code={program.code}
              onChange={changeCode}
              readOnly={running}
              activeLines={activeLines}
              errorLines={errorLines}
              pasoMs={sim.speed}
              fontSize={zoom.fontSize}
            />
            {status === 'error' && sim.error && (
              <div className="err" role="alert">
                {sim.error.line != null ? `línea ${sim.error.line}: ` : ''}
                {sim.error.message.replace(/^L[ií]nea \d+:\s*/, '')}
              </div>
            )}
            {status !== 'error' && fallidos.length > 0 && (
              <div className="err" role="alert">
                {fallidos.map((p) => (
                  <div key={p.id}>
                    <span style={{ color: processTextColor(p.color) }}>{p.name}</span>
                    {p.line > 0 ? `, línea ${p.line}` : ''}: error de ejecución: {p.error}
                  </div>
                ))}
              </div>
            )}
          </div>

          {expanded === null && (
            <Dock drag={abajo} className="abajo">{panel('timeline')}</Dock>
          )}
        </div>

        {expanded === null ? (
          <Dock drag={monitores} className="dock-monitores">{panel('monitors')}</Dock>
        ) : (
          <Dock drag={ampliado} className="dock-ampliado">{panel(expanded)}</Dock>
        )}
      </div>

      <div className="aviso" role="status" aria-live="polite">{notice}</div>
    </div>
  );
}
