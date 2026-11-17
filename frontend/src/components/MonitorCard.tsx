import { memo, useState } from 'react';
import { MonitorDrawing } from './MonitorDrawing';
import { arrowsOf } from '../monitorDiagram';
import { processTextColor } from '../processColor';
import { delayLeft } from '../processStates';
import type { CondView, LogEntry, MonitorView, ProcessView, ProcRef, VarView } from '../types';
import s from './MonitorCard.module.css';

interface Props {
  readonly monitor: MonitorView;
  /** El proceso que tiene el monitor, con su linea y su estado; undefined si esta libre. */
  readonly owner: ProcessView | undefined;
  /** Eventos del ultimo instante que le corresponden a este monitor (ver `eventsAbout`). */
  readonly events: readonly LogEntry[];
  /** Nombre y color de cada proceso por id, para decir quien escribio cada variable. */
  readonly procRefs: ReadonlyMap<number, ProcRef>;
  readonly deadlocked: boolean;
}

/** Elementos de una cola o de un arreglo que se muestran antes de ofrecer abrir el resto. */
const MAX_SHOWN = 6;
/** Variables condicion que se listan siempre; con mas, las vacias se pliegan. */
const MAX_CONDS = 6;
/** Eventos del instante que se cuentan; el resto se resume. */
const MAX_STORY = 3;

/**
 * Un monitor: el dibujo con las tres zonas, que paso en el ultimo instante, quien esta en
 * cada cola y sus variables con quien las escribio y cuando. Memorizada: si el monitor no
 * cambio y no le paso nada en el instante, no se vuelve a dibujar (con un arreglo de cien
 * monitores, en cada paso cambian uno o dos).
 */
export const MonitorCard = memo(function MonitorCard({
  monitor, owner, events, procRefs, deadlocked,
}: Props) {
  const active = arrowsOf(monitor.name, events);
  return (
    <section className={s.card} aria-label={`Monitor ${monitor.name}`}>
      <header className={s.head}>
        <span className={s.name}>{monitor.name}</span>
        {monitor.lockOwner ? (
          <span className={`${s.pill} ${s.pillBusy}`}>
            <i className="punto" style={{ background: monitor.lockOwner.color }} />
            Ocupado por {monitor.lockOwner.name}{ownerNote(owner)}
          </span>
        ) : (
          <span className={s.pill}>Libre</span>
        )}
      </header>

      <MonitorDrawing monitor={monitor} active={active} ownerLine={owner?.line ?? null}
        deadlocked={deadlocked} />

      {events.length > 0 && <Story events={events} />}

      <div className={s.section}>
        <h3 className={s.sectionTitle}>Colas</h3>
        <dl className={s.queues}>
          <dt>Entrada</dt>
          <dd><Queue procs={monitor.entryQueue} /></dd>
          <CondQueues conds={monitor.conds} />
        </dl>
      </div>

      <div className={s.section}>
        <h3 className={s.sectionTitle}>Variables</h3>
        {monitor.vars.length === 0 ? (
          <p className={s.empty}>Este monitor no tiene variables permanentes.</p>
        ) : (
          <table className={s.vars}>
            <thead>
              <tr><th>Nombre</th><th>Tipo</th><th>Valor</th><th>Escribió</th></tr>
            </thead>
            <tbody>
              {monitor.vars.map((v) => (
                <tr key={v.name}>
                  <td className={s.varName}>{v.name}</td>
                  <td><span className={s.varType}>{v.type}</span></td>
                  <td><Value v={v} /></td>
                  <td><Writer v={v} procRefs={procRefs} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}, (prev, next) => prev.monitor === next.monitor && prev.owner === next.owner
  && prev.procRefs === next.procRefs && prev.deadlocked === next.deadlocked
  && sameEvents(prev.events, next.events));

function sameEvents(a: readonly LogEntry[], b: readonly LogEntry[]): boolean {
  return a.length === b.length && a.every((e, i) => e.id === b[i].id);
}

/** Aclaracion sobre el dueno cuando no esta ejecutando: en delay, o esperando en otro monitor. */
function ownerNote(p: ProcessView | undefined): string {
  if (!p || p.state !== 'BLOCKED') return '';
  if (p.delayRemaining !== null) return `, en delay (${delayLeft(p.delayRemaining)})`;
  return `, esperando en ${p.blockedOn ?? 'otro monitor'}`;
}

/** Que paso en el ultimo instante, en palabras: los eventos del motor, con el proceso en su color. */
function Story({ events }: { events: readonly LogEntry[] }) {
  const shown = events.slice(0, MAX_STORY);
  return (
    <p className={s.story}>
      <span className={s.storyLabel}>Instante {events[0].instant}</span>
      <span>
        {shown.map((e, i) => {
          const cut = e.message.indexOf(': ');
          const who = cut < 0 ? '' : e.message.slice(0, cut);
          const what = cut < 0 ? e.message : e.message.slice(cut + 2);
          return (
            <span key={e.id}>
              {who && (
                <b style={{ color: e.processColor ? processTextColor(e.processColor) : undefined }}>{who}</b>
              )}
              {' '}{what}{i < shown.length - 1 ? '; ' : events.length > shown.length ? '; ' : '.'}
            </span>
          );
        })}
        {events.length > shown.length && <>y {events.length - shown.length} eventos más.</>}
      </span>
    </p>
  );
}

/**
 * Una fila por variable condicion. Con muchas (un arreglo de cond por proceso), plegado
 * muestra solo las que tienen a alguien esperando y cuenta las vacias.
 */
function CondQueues({ conds }: { conds: readonly CondView[] }) {
  const [open, setOpen] = useState(false);
  const empty = conds.filter((c) => c.queue.length === 0).length;
  const fold = conds.length > MAX_CONDS && empty > 0;
  const shown = fold && !open ? conds.filter((c) => c.queue.length > 0) : conds;
  return (
    <>
      {shown.map((c) => <QueueRow key={c.name} name={c.name} procs={c.queue} />)}
      {fold && (
        <>
          <dt />
          <dd>
            <button type="button" className={s.more} onClick={() => setOpen(!open)} aria-expanded={open}>
              {open ? 'ocultar las vacías' : `+${empty} variables condición vacías`}
            </button>
          </dd>
        </>
      )}
    </>
  );
}

function QueueRow({ name, procs }: { name: string; procs: readonly ProcRef[] }) {
  return (
    <>
      <dt className={s.cond}>{name}</dt>
      <dd><Queue procs={procs} /></dd>
    </>
  );
}

/** Los procesos de una cola, en orden, como chips; "vacía" si no hay nadie. */
function Queue({ procs }: { procs: readonly ProcRef[] }) {
  const [open, setOpen] = useState(false);
  if (procs.length === 0) return <span className={s.empty}>vacía</span>;
  const shown = open ? procs : procs.slice(0, MAX_SHOWN);
  return (
    <>
      {shown.map((p) => (
        <span key={p.id} className={s.chip}>
          <i className="punto" style={{ background: p.color }} />
          {p.name}
        </span>
      ))}
      {procs.length > MAX_SHOWN && (
        <button type="button" className={s.more} onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? 'ver menos' : `+${procs.length - MAX_SHOWN} más`}
        </button>
      )}
    </>
  );
}

/**
 * El valor de una variable. Un arreglo o una cola se dibuja como celdas: plegado, las
 * primeras y un boton para abrir el resto. El nucleo manda hasta 50 elementos; si hay mas,
 * se dice cuantos faltan.
 */
function Value({ v }: { v: VarView }) {
  const [open, setOpen] = useState(false);
  if (v.elements === null) return <span className={s.varValue}>{v.value}</span>;
  const queue = !v.isArray;
  if (v.size === 0) return <span className={s.empty}>{queue ? 'vacía' : 'sin elementos'}</span>;
  const shown = open ? v.elements : v.elements.slice(0, MAX_SHOWN);
  const notReceived = v.size - v.elements.length;
  return (
    <span className={`${s.cells}${queue ? ` ${s.cellsQueue}` : ''}`}>
      {shown.map((e, i) => (
        <span key={i} className={s.cell}>
          <span className={s.cellValue}>{e}</span>
          {/* en un arreglo cada celda lleva su indice; en una cola solo se marca el frente */}
          <span className={s.cellNote}>{queue ? (i === 0 ? 'frente' : ' ') : i}</span>
        </span>
      ))}
      {open && notReceived > 0 && <span className={`${s.empty} ${s.cellsMore}`}>… {notReceived} más</span>}
      {v.size > MAX_SHOWN && (
        <span className={s.cellsMore}>
          <button type="button" className={s.more} onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? 'ver menos' : `+${v.size - MAX_SHOWN} más`}
          </button>
        </span>
      )}
    </span>
  );
}

/** Quien escribio la variable por ultima vez y en que instante. */
function Writer({ v, procRefs }: { v: VarView; procRefs: ReadonlyMap<number, ProcRef> }) {
  const writer = v.lastWriterId === null ? undefined : procRefs.get(v.lastWriterId);
  if (!writer) return <span className={s.empty}>valor inicial</span>;
  return (
    <span className={s.writer}>
      <i className="punto" style={{ background: writer.color }} />
      {writer.name}{v.lastWriteInstant !== null && `, inst. ${v.lastWriteInstant}`}
    </span>
  );
}
