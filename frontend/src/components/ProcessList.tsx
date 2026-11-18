import { memo, useState } from 'react';
import { SkipForward } from 'lucide-react';
import { processTextColor } from '../processColor';
import { delayLeft, stateDetail, visibleState, whereOf } from '../processStates';
import type { ProcessView, VarView } from '../types';
import { useChangeCount } from '../useChangeCount';
import s from './Inspector.module.css';

interface Props {
  readonly processes: readonly ProcessView[];
  /** Mientras la simulacion corre sola no se elige que proceso avanza. */
  readonly running: boolean;
  /** Avanza un instante en el que solo se mueve ese proceso. */
  readonly onStep: (processId: number) => void;
}

/** Procesos que se listan antes de ofrecer ver el resto: una familia puede tener miles. */
const PAGE = 60;

/** true si el proceso puede avanzar en el proximo instante. */
function canAdvance(p: ProcessView): boolean {
  return p.state === 'READY' || p.state === 'RUNNING';
}

/** Que esta haciendo el proceso, en pocas palabras. */
function summary(p: ProcessView): string {
  const state = visibleState(p);
  if (state === 'TERMINATED') return p.error ? 'terminó con un error' : 'terminó';
  if (state === 'RUNNING_PROCESS') return 'ejecutando su código';
  const detail = stateDetail(state, whereOf(p, state));
  return state === 'DELAYED' && p.delayRemaining !== null
    ? `${detail} · ${delayLeft(p.delayRemaining)}` : detail;
}

/**
 * Pestana Procesos: cada proceso con lo que esta haciendo, su linea y sus variables locales,
 * y un boton para avanzar un instante solo con el.
 */
export function ProcessList({ processes, running, onStep }: Props) {
  const [shown, setShown] = useState(PAGE);
  if (processes.length === 0) return null;
  return (
    <div className={s.procs}>
      {processes.slice(0, shown).map((p) => (
        <ProcessRow key={p.id} process={p} running={running} onStep={onStep} />
      ))}
      {processes.length > shown && (
        <div className={s.moreRow}>
          <button type="button" className="btn btn-chico" onClick={() => setShown(shown + PAGE * 4)}>
            Ver {Math.min(PAGE * 4, processes.length - shown)} más (quedan {processes.length - shown})
          </button>
        </div>
      )}
    </div>
  );
}

interface RowProps {
  readonly process: ProcessView;
  readonly running: boolean;
  readonly onStep: (processId: number) => void;
}

/** Una fila; memorizada: el proceso que no cambio en el instante no se vuelve a dibujar. */
const ProcessRow = memo(function ProcessRow({ process: p, running, onStep }: RowProps) {
  return (
    <div className={s.proc}>
      <div className={s.procMain}>
        <i className="punto" style={{ background: p.color }} />
        <span className={s.procName} style={{ color: processTextColor(p.color) }}>{p.name}</span>
        <State text={summary(p)} />
        <span className={s.procEnd}>
          {p.line > 0 && p.state !== 'TERMINATED' && <span className={s.procLine}>línea {p.line}</span>}
          {p.state !== 'TERMINATED' && (
            <button type="button" className="btn btn-chico" disabled={running || !canAdvance(p)}
              onClick={() => onStep(p.id)}
              title={canAdvance(p) ? `Avanzar un instante solo con ${p.name}` : `${p.name} no puede avanzar ahora`}>
              <SkipForward size={12} /> Avanzar
            </button>
          )}
        </span>
      </div>
      {p.error && <p className={s.procError}>Error de ejecución: {p.error}</p>}
      {p.locals.length > 0 && p.state !== 'TERMINATED' && (
        <div className={s.locals} aria-label={`Variables locales de ${p.name}`}>
          {p.locals.map((v) => <Local key={v.name} v={v} />)}
        </div>
      )}
    </div>
  );
});

/** Lo que esta haciendo el proceso; cuando cambia, el texto nuevo entra con un fundido. */
function State({ text }: { text: string }) {
  const changes = useChangeCount(text);
  return (
    <span key={changes} className={`${s.procState}${changes > 0 ? ` ${s.stateIn}` : ''}`} title={text}>{text}</span>
  );
}

/** Una variable local; cuando cambia su valor, se destaca un momento. */
function Local({ v }: { v: VarView }) {
  const changes = useChangeCount(v.value);
  return (
    <span key={changes} className={`${s.local}${changes > 0 ? ` ${s.localChanged}` : ''}`}
      title={`${v.type} ${v.name}`}>
      <b>{v.name}</b> = {v.value}
    </span>
  );
}
