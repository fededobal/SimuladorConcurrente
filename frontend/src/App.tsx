import { useMemo } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Header } from './components/Header';
import { CodeEditor, type ActiveLine } from './components/CodeEditor';
import { MonitorsPanel } from './components/MonitorsPanel';
import { ProcessList } from './components/ProcessList';
import { Timeline } from './components/Timeline';
import { EventLog } from './components/EventLog';
import { useSimulation } from './useSimulation';

const DEFAULT_CODE = `// Buffer de un dato entre un productor y un consumidor.
// El monitor da exclusion mutua; 'libre' y 'ocupado' sincronizan por condicion.

monitor Buffer {
  int dato = 0;
  boolean hayDato = false;
  cond libre, ocupado;

  procedure depositar(d: in int) {
    while (hayDato) wait(libre);
    dato = d;
    hayDato = true;
    signal(ocupado);
  }

  procedure retirar(r: out int) {
    while (not hayDato) wait(ocupado);
    r = dato;
    hayDato = false;
    signal(libre);
  }
}

process Productor {
  int i = 1;
  while (i <= 5) {
    Buffer.depositar(i);
    i++;
  }
}

process Consumidor {
  int x = 0;
  int recibidos = 0;
  while (recibidos < 5) {
    Buffer.retirar(x);
    recibidos++;
  }
}
`;

export function App() {
  const sim = useSimulation(DEFAULT_CODE);
  const { snapshot, status } = sim;

  const activeLines: ActiveLine[] = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.processes
      .filter((p) => p.line > 0 && p.state !== 'TERMINATED')
      .map((p) => ({ line: p.line, color: p.color, state: p.state, name: p.name }));
  }, [snapshot]);

  const editorReadOnly = status !== 'idle' && status !== 'error';
  const canPick = status === 'ready' || status === 'paused';

  return (
    <div className="app">
      <Header
        status={status}
        instant={snapshot?.instant ?? 0}
        isHistorical={sim.isHistorical}
        policy={sim.policy}
        onPolicy={sim.setPolicy}
        speed={sim.speed}
        speeds={sim.speeds}
        onSpeed={sim.setSpeed}
        onPlay={sim.play}
        onPause={sim.pause}
        onStep={() => sim.stepOnce()}
        onReset={sim.reset}
        onStop={sim.stop}
      />

      <div className="workspace">
        <PanelGroup direction="vertical">
          <Panel defaultSize={62} minSize={25}>
            <PanelGroup direction="horizontal">
              <Panel defaultSize={52} minSize={25}>
                <div className="panel" style={{ height: '100%' }}>
                  <div className="panel-header">
                    Código
                    {editorReadOnly && (
                      <span className="muted" style={{ textTransform: 'none' }}>
                        solo lectura durante la simulación
                      </span>
                    )}
                  </div>
                  <CodeEditor
                    code={sim.code}
                    onChange={sim.setCode}
                    readOnly={editorReadOnly}
                    activeLines={activeLines}
                    errorLine={status === 'error' ? sim.error?.line ?? null : null}
                  />
                  {status === 'error' && sim.error && (
                    <div className="error-bar">
                      {sim.error.line != null ? `Línea ${sim.error.line}: ` : ''}
                      {sim.error.message.replace(/^Linea \d+:\s*/, '')}
                    </div>
                  )}
                </div>
              </Panel>
              <PanelResizeHandle className="resize-v" />
              <Panel defaultSize={26} minSize={16}>
                <MonitorsPanel snapshot={snapshot} />
              </Panel>
              <PanelResizeHandle className="resize-v" />
              <Panel defaultSize={22} minSize={14}>
                <ProcessList snapshot={snapshot} canPick={canPick} onPick={(id) => sim.stepOnce(id)} />
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="resize-h" />

          <Panel defaultSize={38} minSize={15}>
            <PanelGroup direction="horizontal">
              <Panel defaultSize={62} minSize={25}>
                <Timeline entries={sim.entries} viewIndex={sim.viewIndex} onHover={sim.setHoverIndex} />
              </Panel>
              <PanelResizeHandle className="resize-v" />
              <Panel defaultSize={38} minSize={20}>
                <EventLog entries={sim.entries} viewIndex={sim.viewIndex} onHover={sim.setHoverIndex} />
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
