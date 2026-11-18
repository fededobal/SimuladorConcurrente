import { ExternalLink, RotateCcw, TriangleAlert } from 'lucide-react';
import type { BlockedProcess } from '../deadlock';
import { processTextColor } from '../processColor';
import s from './EditorPane.module.css';

interface Props {
  readonly instant: number;
  readonly blocked: readonly BlockedProcess[];
  /** Mensaje completo del motor ("Deadlock: ... P espera en B.c y retiene A"), si lo hay. */
  readonly engineMessage: string | null;
  /** true si antes del deadlock algun proceso termino con un error de ejecucion. */
  readonly afterError: boolean;
  readonly onShowInstant: () => void;
  readonly onReplay: () => void;
}

/** Comienzo del mensaje del motor, igual en todos los deadlocks. */
const GENERIC_MESSAGE = /^Deadlock: ningún proceso puede avanzar\.?/;

/** Procesos que se explican uno por uno; con mas, el resto se resume. */
const MAX_EXPLAINED = 3;

/**
 * Cartel de deadlock, arriba del editor. Es el momento mas didactico de una ejecucion y
 * antes se avisaba solo con una pildora en la esquina: aca dice quien espera, donde, y por
 * que nadie puede despertarlo, con las acciones para investigarlo.
 */
export function DeadlockBanner({
  instant, blocked, engineMessage, afterError, onShowInstant, onReplay,
}: Props) {
  const explained = blocked.slice(0, MAX_EXPLAINED);
  // del mensaje del motor se muestra lo que agrega al titulo: quien espera donde y que retiene
  const detail = engineMessage?.replace(GENERIC_MESSAGE, '').trim() ?? '';
  const sleeping = blocked.filter((b) => b.kind === 'cond');
  return (
    <section className={s.deadlock} role="alert" aria-label="Deadlock">
      <TriangleAlert size={18} className={s.deadlockIcon} aria-hidden="true" />
      <div className={s.deadlockBody}>
        <h2>Deadlock en el instante {instant}</h2>
        <p>
          Ningún proceso puede avanzar.{' '}
          {explained.map((b) => <Sentence key={b.id} b={b} />)}
          {blocked.length > explained.length && (
            <>Y {blocked.length - explained.length} procesos más están bloqueados. </>
          )}
          {sleeping.length === 1 && blocked.length === 1 ? (
            <>No queda ningún proceso que pueda hacer <code>signal({sleeping[0].cond})</code> para despertarlo.</>
          ) : (
            <>Ninguno de los que quedan puede hacer el <code>signal</code> ni liberar el monitor que esperan los demás.</>
          )}
        </p>
        {afterError && (
          <p>Antes hubo un error de ejecución (marcado en rojo): conviene resolverlo primero, porque el proceso que falló pudo ser el que tenía que despertar a los demás.</p>
        )}
        {detail && <p className={s.engine}>{detail}</p>}
        <div className={s.actions}>
          <button type="button" className="btn" onClick={onShowInstant}>
            Ver el instante {instant} en la línea de tiempo
          </button>
          <button type="button" className="btn" onClick={onReplay}>
            <RotateCcw size={13} /> Repetir con la misma semilla
          </button>
          <a className={s.help} href="/docs/operacion/deadlock" target="_blank" rel="noreferrer">
            Qué es un deadlock <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </section>
  );
}

/** Una oracion por proceso: donde quedo y que retiene. */
function Sentence({ b }: { b: BlockedProcess }) {
  const name = <b style={{ color: processTextColor(b.color) }}>{b.name}</b>;
  const holding = b.holding.length > 0 && <>, sin soltar <b>{b.holding.join(', ')}</b></>;
  if (b.kind === 'cond') {
    return <>{name} está dormido en <code>wait({b.cond})</code> del monitor <b>{b.monitor}</b>{holding}. </>;
  }
  return (
    <>
      {name} espera entrar a <b>{b.monitor}</b>
      {b.owner && <>, que tiene <b>{b.owner}</b></>}{holding}.{' '}
    </>
  );
}
