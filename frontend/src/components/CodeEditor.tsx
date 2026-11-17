import { useMemo, useRef, useState } from 'react';
import { handleEditingKey } from '../editor/editing';
import { highlight } from '../editor/highlight';
import { useLineMetrics } from '../editor/useLineMetrics';
import { segundosRestantes, useAhora } from '../useAhora';
import { MAX_VISIBLES } from './MasMenos';
import { STATE_CLASS, type VisibleState } from '../processStates';
import { processTextColor } from '../processColor';

/** Renglon donde esta parado un proceso: la franja toma el color del estado, el nombre el del proceso. */
export interface ActiveLine {
  line: number;
  color: string;
  state: VisibleState;
  name: string;
  /** Hora (ms, como Date.now()) en que termina su delay, o null si no esta demorado. */
  delayEndsAt: number | null;
}

interface Props {
  code: string;
  onChange: (code: string) => void;
  readOnly: boolean;
  activeLines: ActiveLine[];
  /** Lineas con error: la de compilacion o las de los procesos que fallaron al ejecutar. */
  errorLines: readonly number[];
  /** Duracion de un instante, en ms: el deslizamiento se acompasa a la simulacion. */
  pasoMs: number;
  /** Tamano de letra del codigo, en px (zoom del editor). */
  fontSize: number;
}

/** Ancho aproximado de un caracter de la etiqueta (10px, tipografia sans). */
const ANCHO_CHAR = 5.6;
const HUECO_ETIQUETA = 10;
/** Ancho aproximado del contador de un delay ("12s"), con su margen. */
const ANCHO_CONTADOR = 30;


const RANK: Record<VisibleState, number> = {
  RUNNING_MONITOR: 0, RUNNING_PROCESS: 0, COMPETING: 1, WAITING: 2, DELAYED: 2, READY: 3,
  TERMINATED: 4,
};

const NAME_ALPHA: Record<VisibleState, number> = {
  RUNNING_MONITOR: 1, RUNNING_PROCESS: 1, COMPETING: 0.8, WAITING: 0.8, DELAYED: 0.8, READY: 0.45,
  TERMINATED: 0.3,
};

export function CodeEditor({
  code, onChange, readOnly, activeLines, errorLines, pasoMs, fontSize,
}: Props) {
  // El deslizamiento ocupa la mayor parte del instante pero termina antes del siguiente:
  // si durara lo mismo, las franjas nunca se verian quietas sobre el renglon que ejecutan.
  // Corto y con salida rapida: la franja llega enseguida al renglon y se queda ahi. Si el
  // deslizamiento ocupara casi todo el instante, la banda pasaria mas tiempo entre dos
  // renglones que sobre el que se esta ejecutando, que es justo lo que hay que evitar.
  const desliz = Math.min(Math.round(pasoMs * 0.45), 260);

  const capaRef = useRef<HTMLPreElement>(null);
  const metrica = useLineMetrics(capaRef);

  const yDe = (linea: number) => metrica.top + (linea - 1) * metrica.lineHeight;
  const lines = code.split('\n');

  // Renglones cuyas etiquetas el alumno abrio enteras (con mas de MAX_VISIBLES procesos).
  const [abiertas, setAbiertas] = useState<ReadonlySet<number>>(new Set());
  const alternar = (linea: number) => setAbiertas((prev) => {
    const next = new Set(prev);
    if (!next.delete(linea)) next.add(linea);
    return next;
  });

  // Una franja POR PROCESO, no por linea. Es lo que hace que el avance se vea suave: al
  // moverse de renglon sobrevive el mismo nodo del DOM y la transicion de CSS lo desliza.
  // Si se agrupara por linea, React desmontaria la franja vieja y montaria otra, y no hay
  // nada que animar entre dos elementos distintos.
  const marcas = useMemo(() => {
    const porLinea = new Map<number, ActiveLine[]>();
    for (const a of activeLines) {
      if (a.line < 1) continue;
      const list = porLinea.get(a.line) ?? [];
      list.push(a);
      porLinea.set(a.line, list);
    }
    // Ahora que avanzan varios procesos a la vez, compartir renglon es normal: las
    // etiquetas se corren para no taparse entre si. Con mas de MAX_VISIBLES en el mismo
    // renglon, las demas se esconden y la ultima visible lleva un boton "+n" que las abre.
    const salida: Array<ActiveLine & { corrimiento: number; oculta: boolean; faltan: number }> = [];
    for (const [linea, procs] of porLinea) {
      procs.sort((x, y) => RANK[x.state] - RANK[y.state] || x.name.localeCompare(y.name));
      const abierta = abiertas.has(linea);
      const visibles = abierta ? procs.length : Math.min(procs.length, MAX_VISIBLES);
      let corrimiento = 0;
      procs.forEach((p, i) => {
        const oculta = i >= visibles;
        const ultima = i === visibles - 1 && procs.length > MAX_VISIBLES;
        salida.push({ ...p, corrimiento, oculta, faltan: ultima ? procs.length - visibles : 0 });
        if (oculta) return;
        corrimiento += p.name.length * ANCHO_CHAR + HUECO_ETIQUETA
          + (p.delayEndsAt !== null ? ANCHO_CONTADOR : 0);
      });
    }
    return salida;
  }, [activeLines, abiertas]);
  const ahora = useAhora(marcas.some((m) => m.delayEndsAt !== null));

  return (
    <div
      className="editor"
      style={{
        ['--desliz' as string]: `${desliz}ms`,
        // el interlineado acompana a la letra; las franjas se miden del DOM, asi que siguen
        ['--line-h' as string]: `${Math.round(fontSize * 1.7)}px`,
        fontSize,
      }}
    >
      <div className="doc">
        <div className="gutter">{lines.map((_, i) => `${i + 1}\n`).join('')}</div>
        <div className="area">
          <pre ref={capaRef} className="layer" dangerouslySetInnerHTML={{ __html: highlight(code) + '\n' }} />

          {marcas.map((p) => (
            <div
              key={p.name}
              className={`stripe ${STATE_CLASS[p.state]}`}
              style={{
                top: yDe(p.line),
                height: metrica.lineHeight,
                ['--st-proceso' as string]: p.color,
                zIndex: RANK[p.state] === 0 ? 2 : 1,
              }}
            >
              {!p.oculta && (
                <span
                  className="who"
                  style={{
                    color: processTextColor(p.color),
                    opacity: NAME_ALPHA[p.state],
                    transform: `translateX(${-p.corrimiento}px)`,
                  }}
                >
                  {(p.faltan > 0 || (abiertas.has(p.line) && p.corrimiento === 0)) && (
                    <button
                      type="button"
                      className="who-mas"
                      onClick={() => alternar(p.line)}
                      aria-expanded={abiertas.has(p.line)}
                      title={abiertas.has(p.line) ? 'ver menos'
                        : `${p.faltan} procesos más en este renglón`}
                    >
                      {abiertas.has(p.line) ? 'ver menos' : `+${p.faltan}`}
                    </button>
                  )}
                  {p.name}
                  {p.delayEndsAt !== null && (
                    <span
                      className="delay-count"
                      title={`delay: faltan ${segundosRestantes(p.delayEndsAt, ahora)} s`}
                    >
                      {segundosRestantes(p.delayEndsAt, ahora)}s
                    </span>
                  )}
                </span>
              )}
            </div>
          ))}

          {errorLines.map((linea) => (
            <div
              key={`error-${linea}`}
              className="stripe"
              style={{
                top: yDe(linea),
                height: metrica.lineHeight,
                background: 'color-mix(in srgb, var(--danger) 15%, transparent)',
                borderLeft: '2px solid var(--danger)',
              }}
            />
          ))}

          <textarea
            value={code}
            spellCheck={false}
            readOnly={readOnly}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={readOnly ? undefined : handleEditingKey}
          />
        </div>
      </div>
    </div>
  );
}
