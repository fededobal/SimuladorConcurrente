import { useEffect, useMemo, useRef, useState } from 'react';
import type { CursorPosition } from './components/CodeEditor';
import { Dock } from './components/Dock';
import { EditorPane } from './components/EditorPane';
import { Inspector } from './components/Inspector';
import { ProgramMenu } from './components/ProgramMenu';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { StatusBar } from './components/StatusBar';
import { Timeline } from './components/Timeline';
import { TopBar } from './components/TopBar';
import { blockedProcesses } from './deadlock';
import type { ActiveLine } from './editor/lineMarks';
import { EJEMPLOS } from './ejemplos';
import { downloadText, readTextFile } from './files';
import { visibleState, whereOf } from './processStates';
import { DEFAULT_NAME, fileNameOf, nameFromFile, type Program, type SavedProgram } from './programs';
import { decodeShare, encodeShare, exampleIdFromHash, type SharedProgram } from './shareLink';
import { statusTextOf } from './statusText';
import { timelineHeight } from './timelineLayout';
import { useDragSize } from './useDragSize';
import { useEditorZoom } from './useEditorZoom';
import { useProgram } from './useProgram';
import { useShortcuts } from './useShortcuts';
import { useSimulation } from './useSimulation';
import { useTheme } from './useTheme';
import s from './App.module.css';

/** Programa con el que arranca quien entra por primera vez: el primer ejemplo. */
const FIRST_PROGRAM: Program = {
  id: null,
  name: EJEMPLOS[0]?.titulo ?? DEFAULT_NAME,
  code: EJEMPLOS[0]?.codigo ?? '',
};

/** Cuanto queda en pantalla un aviso corto, en ms. */
const NOTICE_MS = 4000;

/** true si el programa es trabajo propio que no esta en "Mis programas" ni es un ejemplo. */
function isUnsavedWork(program: Program): boolean {
  return program.id === null && program.code.trim() !== ''
    && !EJEMPLOS.some((e) => e.codigo === program.code);
}

/**
 * La aplicacion: une el programa abierto (useProgram) con su simulacion (useSimulation) y
 * reparte el estado entre la barra, el editor, el inspector, la linea de tiempo y la barra
 * de estado. Los componentes reciben datos y avisan con callbacks; ninguno llama al motor.
 */
export function App() {
  const store = useProgram(FIRST_PROGRAM);
  const { program } = store;
  const sim = useSimulation(program.code);
  const { snapshot, status } = sim;
  const zoom = useEditorZoom();
  const theme = useTheme();

  // lo ultimo de cada hook, para los manejadores que se registran una sola vez
  const storeRef = useRef(store);
  const simRef = useRef(sim);
  storeRef.current = store;
  simRef.current = sim;

  // aviso corto abajo a la derecha (archivo que no se pudo abrir, enlace copiado)
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (notice === null) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const [cursor, setCursor] = useState<CursorPosition>({ line: 1, column: 1 });
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Los dos paneles se agrandan o achican arrastrando el borde que mira al editor.
  const timelineSize = useDragSize('y', 'Cambiar el alto de la línea de tiempo');
  const inspectorSize = useDragSize('x', 'Cambiar el ancho del inspector');
  const [inspectorWide, setInspectorWide] = useState(false);

  const activeLines: ActiveLine[] = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.processes
      .filter((p) => p.line > 0 && p.state !== 'TERMINATED')
      .map((p) => {
        const state = visibleState(p);
        return {
          line: p.line, color: p.color, state, name: p.name, where: whereOf(p, state),
          delayRemaining: p.delayRemaining,
        };
      });
  }, [snapshot]);

  // Procesos que terminaron por un error de ejecucion: se muestran con su linea.
  const failed = useMemo(
    () => snapshot?.processes.filter((p) => p.error !== null) ?? [],
    [snapshot],
  );
  const errorLines = useMemo(() => {
    if (status === 'error') return sim.error?.line != null ? [sim.error.line] : [];
    return failed.filter((p) => p.line > 0).map((p) => p.line);
  }, [status, sim.error, failed]);

  // Interbloqueo: que espera cada proceso bloqueado, para el cartel y la tabla del panel.
  const blocked = useMemo(
    () => (status === 'deadlock' && snapshot ? blockedProcesses(snapshot) : []),
    [status, snapshot],
  );
  // pedido a la linea de tiempo de mostrar un instante (el del interbloqueo)
  const [timelineFocus, setTimelineFocus] = useState<{ instant: number; nonce: number } | null>(null);
  const showInstant = (instant: number) => {
    setTimelineFocus((prev) => ({ instant, nonce: (prev?.nonce ?? 0) + 1 }));
  };

  const running = status === 'running';
  // solo se puede detener una simulacion que todavia puede avanzar
  const active = status === 'ready' || status === 'running' || status === 'paused';
  const statusText = statusTextOf(status, sim.waiting, failed.length);

  const changeCode = (code: string) => {
    store.setCode(code);
    sim.invalidate();
  };

  /**
   * Abre otro programa en el editor. Si el actual es trabajo propio que no esta en "Mis
   * programas", avisa antes de pisarlo: el guardado automatico solo conserva el abierto.
   */
  const openProgram = (next: Program) => {
    if (isUnsavedWork(program) && !window.confirm(
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

  /** Copia al portapapeles un enlace que abre este programa (y repite la ultima ejecucion). */
  const copyShareLink = async () => {
    const fragment = encodeShare({
      name: program.name, code: program.code, seed: sim.seed,
      policy: sim.seed === null ? null : sim.policy,
    });
    const url = `${window.location.origin}${window.location.pathname}#${fragment}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice('Enlace copiado. Quien lo abra ve este programa en su simulador.');
    } catch {
      // sin permiso para el portapapeles: se muestra el enlace para copiarlo a mano
      window.prompt('Copiá este enlace para compartir el programa:', url);
    }
  };

  // Un enlace compartido trae el programa en el fragmento. Se abre y se limpia la direccion,
  // para que recargar la pestana no vuelva a pisar lo que se escriba despues.
  useEffect(() => {
    const openShared = (askFirst: boolean) => {
      // desde la guia: "#ejemplo=<id>" abre uno de los programas del menu Ejemplos
      const exampleId = exampleIdFromHash(window.location.hash);
      const example = exampleId === null ? undefined : EJEMPLOS.find((e) => e.id === exampleId);
      const shared: SharedProgram | null = example
        ? { name: example.titulo, code: example.codigo, seed: null, policy: null }
        : decodeShare(window.location.hash);
      if (!shared) return;
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      const current = storeRef.current.program;
      if (isUnsavedWork(current) && current.code !== shared.code) {
        // al cargar la pagina no se puede preguntar antes de mostrar nada: lo que habia sin
        // guardar pasa a "Mis programas" en lugar de perderse
        if (askFirst && !window.confirm(
          `Se abre "${shared.name}" desde el enlace. "${current.name}" pasa a Mis programas. ¿Seguir?`,
        )) return;
        storeRef.current.keepCopy(current);
      }
      storeRef.current.open({ id: null, name: shared.name, code: shared.code });
      simRef.current.reset(shared.seed);
      if (shared.policy) simRef.current.setPolicy(shared.policy);
      setNotice(example ? `Se abrió el ejemplo "${shared.name}".` : `Se abrió "${shared.name}" desde un enlace.`);
    };
    openShared(false);
    const onHashChange = () => openShared(true);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useShortcuts((action) => {
    switch (action) {
      case 'toggle-run':
        if (running) sim.pause();
        else sim.play();
        break;
      case 'step':
        if (!running) sim.step();
        break;
      case 'stop':
        if (active) sim.stop();
        break;
      case 'help':
        setShortcutsOpen(true);
        break;
    }
  });

  return (
    <div className={s.app}>
      <TopBar
        programMenu={(
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
        )}
        running={running}
        active={active}
        canReplay={sim.seed !== null}
        seed={sim.seed}
        processes={snapshot?.processes ?? []}
        speed={sim.speed}
        policy={sim.policy}
        statusText={statusText.text}
        statusTone={statusText.tone}
        instant={snapshot?.instant ?? 0}
        darkTheme={theme.theme === 'dark'}
        onPlay={sim.play}
        onPause={sim.pause}
        onStep={sim.step}
        onPrepare={sim.prepare}
        onStop={sim.stop}
        onReplay={sim.replay}
        onSpeed={sim.setSpeed}
        onPolicy={sim.setPolicy}
        onShare={copyShareLink}
        onToggleTheme={theme.toggle}
      />

      <div className={s.main}>
        <EditorPane
          programName={program.name}
          saving={store.saveState === 'saving'}
          code={program.code}
          onChange={changeCode}
          readOnly={running}
          activeLines={activeLines}
          errorLines={errorLines}
          pasoMs={sim.speed}
          zoom={zoom}
          onCursor={setCursor}
          processes={snapshot?.processes ?? []}
          compileError={status === 'error' ? sim.error : null}
          failed={failed}
          deadlock={sim.deadlock}
          blocked={blocked}
          onShowInstant={showInstant}
          onReplay={sim.replay}
        />
        <Dock drag={inspectorSize} className={`${s.inspectorDock}${inspectorWide ? ` ${s.inspectorWide}` : ''}`}>
          <Inspector
            snapshot={snapshot}
            entries={sim.entries}
            blocked={blocked}
            running={running}
            wide={inspectorWide}
            onToggleWide={() => setInspectorWide((w) => !w)}
            onStepProcess={sim.step}
          />
        </Dock>
      </div>

      <Dock drag={timelineSize} className={s.timelineDock}
        autoSize={timelineHeight(sim.timeline.monitors.length + sim.timeline.order.length)}>
        <Timeline timeline={sim.timeline} processes={snapshot?.processes ?? []}
          deadlockInstant={sim.deadlock?.instant ?? null} focus={timelineFocus} />
      </Dock>

      <StatusBar
        cursor={cursor}
        counts={snapshot ? { processes: snapshot.processes.length, monitors: snapshot.monitors.length } : null}
        policy={sim.policy}
        seed={sim.seed}
        saveState={store.saveState}
        inLibrary={program.id !== null}
        running={running}
        ended={status === 'finished' || status === 'deadlock'}
        onShowShortcuts={() => setShortcutsOpen(true)}
      />

      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <div className={s.notice} role="status" aria-live="polite">{notice}</div>
    </div>
  );
}
