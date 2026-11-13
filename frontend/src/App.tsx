import { useEffect, useMemo, useState } from 'react';
import { Play, Pause, SkipForward, Square, ZoomIn, ZoomOut } from 'lucide-react';
import { CodeEditor, type ActiveLine } from './components/CodeEditor';
import { Dock } from './components/Dock';
import { OutputPanel } from './components/OutputPanel';
import { MonitorPanel } from './components/MonitorPanel';
import { useSimulation, type SimStatus } from './useSimulation';
import { EJEMPLOS } from './ejemplos';
import { Timeline } from './components/Timeline';
import { visibleState } from './processStates';
import { useDragSize } from './useDragSize';
import { useEditorZoom } from './useEditorZoom';
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
  RANDOM: 'turnos al azar',
  ROUND_ROBIN: 'turnos en ronda',
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

export function App() {
  const sim = useSimulation(EJEMPLOS[0]?.codigo ?? '');
  const { snapshot, status } = sim;
  const zoom = useEditorZoom();

  // Cada panel se agranda o achica arrastrando el borde que mira al editor.
  const abajo = useDragSize('simulador.panelInferior.alto', 'y', 'Cambiar el alto del panel de abajo');
  const salida = useDragSize('simulador.salida.ancho', 'x', 'Cambiar el ancho de la salida');
  const monitores = useDragSize('simulador.monitores.ancho', 'x', 'Cambiar el ancho de los monitores');
  const ampliado = useDragSize('simulador.ampliado.ancho', 'x', 'Cambiar el ancho del panel ampliado');

  // Un panel ampliado ocupa la derecha a toda altura; los otros dos se ocultan hasta cerrarlo.
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
      .map((p) => ({
        line: p.line, color: p.color, state: visibleState(p), name: p.name,
        delayEndsAt: p.delayEndsAt,
      }));
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

  const cargarEjemplo = (id: string) => {
    const ejemplo = EJEMPLOS.find((e) => e.id === id);
    if (!ejemplo) return;
    // Si el editor tiene un programa propio, avisar antes de pisarlo.
    const propio = !EJEMPLOS.some((e) => e.codigo === sim.code);
    if (propio && !window.confirm('Se reemplaza el programa del editor por el ejemplo. ¿Seguir?')) {
      return;
    }
    sim.setCode(ejemplo.codigo);
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
          <button className="btn btn-main" onClick={sim.pause}>
            <Pause size={14} /> Pausar
          </button>
        ) : (
          <button className="btn btn-main" onClick={sim.play}>
            <Play size={14} /> Ejecutar
          </button>
        )}

        <button className="btn" onClick={sim.step} disabled={running}>
          <SkipForward size={14} /> Paso
        </button>

        <button className="btn" onClick={sim.stop} disabled={!active}>
          <Square size={14} /> Detener
        </button>

        <select
          className="sel"
          value={sim.speed}
          onChange={(e) => sim.setSpeed(Number(e.target.value))}
        >
          {sim.speeds.map((s) => (
            <option key={s} value={s}>{SPEED_LABEL[s] ?? `${s}ms`}</option>
          ))}
        </select>

        <select
          className="sel"
          value={sim.policy}
          onChange={(e) => sim.setPolicy(e.target.value as SchedulingPolicy)}
          aria-label="Política de planificación"
          title="Al azar: en cada instante avanza un subconjunto aleatorio de los procesos listos. En ronda: avanzan todos los listos, por turno."
        >
          {(Object.keys(POLICY_LABEL) as SchedulingPolicy[]).map((p) => (
            <option key={p} value={p}>{POLICY_LABEL[p]}</option>
          ))}
        </select>

        <select
          className="sel"
          value=""
          onChange={(e) => cargarEjemplo(e.target.value)}
          disabled={running}
          aria-label="Cargar un programa de ejemplo"
        >
          <option value="" disabled>Ejemplos…</option>
          {EJEMPLOS.map((e) => (
            <option key={e.id} value={e.id}>{e.titulo}</option>
          ))}
        </select>

        <div className="spacer" />

        <div className="zoom" role="group" aria-label="Tamaño de letra del editor">
          <button className="btn btn-icono" onClick={zoom.zoomOut} disabled={!zoom.canZoomOut}
            aria-label="Achicar la letra del código" title="Achicar la letra del código">
            <ZoomOut size={15} />
          </button>
          <button className="btn btn-icono" onClick={zoom.zoomIn} disabled={!zoom.canZoomIn}
            aria-label="Agrandar la letra del código" title="Agrandar la letra del código">
            <ZoomIn size={15} />
          </button>
        </div>

        <div className="meta">
          <span className={`st${mal ? ' bad' : ''}`}>{etiqueta}</span>
          <span className="n">{snapshot?.instant ?? 0}</span>
        </div>
      </div>

      <div className="cuerpo">
        <div className="stage tarjeta">
          <CodeEditor
            code={sim.code}
            onChange={sim.setCode}
            readOnly={running}
            activeLines={activeLines}
            errorLines={errorLines}
            pasoMs={sim.speed}
            fontSize={zoom.fontSize}
          />
          {status === 'error' && sim.error && (
            <div className="err">
              {sim.error.line != null ? `línea ${sim.error.line}: ` : ''}
              {sim.error.message.replace(/^L[ií]nea \d+:\s*/, '')}
            </div>
          )}
          {status !== 'error' && fallidos.length > 0 && (
            <div className="err" role="alert">
              {fallidos.map((p) => (
                <div key={p.id}>
                  <span style={{ color: p.color }}>{p.name}</span>
                  {p.line > 0 ? `, línea ${p.line}` : ''}: error de ejecución: {p.error}
                </div>
              ))}
            </div>
          )}
        </div>

        {expanded === null ? (
          <Dock drag={salida} className="dock-salida">{panel('output')}</Dock>
        ) : (
          <Dock drag={ampliado} className="dock-ampliado">{panel(expanded)}</Dock>
        )}
      </div>

      {expanded === null && (
        <Dock drag={abajo} className="abajo">
          {panel('timeline')}
          <Dock drag={monitores} className="dock-monitores">{panel('monitors')}</Dock>
        </Dock>
      )}
    </div>
  );
}
