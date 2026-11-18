import { memo, useState } from 'react';
import { MonitorDrawing } from './MonitorDrawing';
import { travelsOf } from '../monitorDiagram';
import { processTextColor } from '../processColor';
import { delayLeft } from '../processStates';
import type { CondView, LogEntry, MonitorView, ProcessView, ProcRef, VarView } from '../types';
import { useChangeCount } from '../useChangeCount';
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
  const travels = travelsOf(monitor.name, events);
  return (
    <section className={s.card} aria-label={`Monitor ${monitor.name}`}>
      <header className={s.head}>
        <span className={s.name}>{monitor.name}</span>
        {/* una sola pastilla para libre y ocupado: asi el cambio de color es una transicion */}
        <span className={`${s.pill}${monitor.lockOwner ? ` ${s.pillBusy}` : ''}`}>
          {monitor.lockOwner ? (
            <>
              <i className="punto" style={{ background: monitor.lockOwner.color }} />
              <span className={s.pillText} title={`Ocupado por ${monitor.lockOwner.name}${ownerNote(owner)}`}>
                Ocupado por {monitor.lockOwner.name}{ownerNote(owner)}
              </span>
            </>
          ) : 'Libre'}
        </span>
      </header>

      <MonitorDrawing monitor={monitor} travels={travels} ownerLine={owner?.line ?? null}
        deadlocked={deadlocked} />

      {/* la clave es el instante: el relato de cada uno entra con un fundido */}
      {events.length > 0 && <Story key={events[0].instant} events={events} />}

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
          <div className={s.varsWrap}>
            <table className={s.vars}>
              <thead>
                <tr><th>Nombre</th><th>Tipo</th><th>Valor</th><th>Escribió</th></tr>
              </thead>
              <tbody>
                {monitor.vars.map((v) => <VarRows key={v.name} v={v} procRefs={procRefs} />)}
              </tbody>
            </table>
          </div>
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
      <span className={s.storyText}>
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
            <button type="button" className={s.more} onClick={() => setOpen(!open)} aria-expanded={open}
              title={open ? undefined : 'Mostrar también las variables condición sin nadie esperando'}>
              {open ? 'ocultar las vacías' : `+${empty} cond vacías`}
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
 * Las filas de una variable en la tabla. Una variable simple ocupa una fila. Un arreglo o
 * una cola ocupa dos: en la primera el tipo toma tambien la columna del valor, y las celdas
 * van debajo, a todo el ancho de la tabla.
 */
function VarRows({ v, procRefs }: { v: VarView; procRefs: ReadonlyMap<number, ProcRef> }) {
  if (v.elements === null) {
    return (
      <tr>
        <td className={s.varName}>{v.name}</td>
        <td><span className={s.varType}>{v.type}</span></td>
        <td><ScalarValue value={v.value} /></td>
        <td><Writer v={v} procRefs={procRefs} /></td>
      </tr>
    );
  }
  return (
    <>
      <tr className={s.hasCells}>
        <td className={s.varName}>{v.name}</td>
        <td colSpan={2}><span className={s.varType}>{v.type}</span></td>
        <td><Writer v={v} procRefs={procRefs} /></td>
      </tr>
      <tr>
        <td colSpan={4} className={s.cellsRow}><Cells v={v} elements={v.elements} /></td>
      </tr>
    </>
  );
}

/** Valor de una variable simple; cuando cambia, se destaca un momento. */
function ScalarValue({ value }: { value: string }) {
  const changes = useChangeCount(value);
  return <span key={changes} className={`${s.varValue}${changes > 0 ? ` ${s.changed}` : ''}`}>{value}</span>;
}

/**
 * Celda de un arreglo o de una cola. En un arreglo, el elemento que cambia se destaca un
 * momento; en una cola no, porque al sacar el frente cambian todos los casilleros a la vez.
 */
function Cell({ value, note, flash }: { value: string; note: string; flash: boolean }) {
  const changes = useChangeCount(value);
  return (
    <span className={s.cell}>
      <span key={changes} className={`${s.cellValue}${flash && changes > 0 ? ` ${s.changed}` : ''}`}>{value}</span>
      <span className={s.cellNote}>{note}</span>
    </span>
  );
}

/**
 * Un arreglo o una cola, como celdas: plegado, las primeras y un boton para abrir el resto.
 * El nucleo manda hasta 50 elementos; si hay mas, se dice cuantos faltan.
 */
function Cells({ v, elements }: { v: VarView; elements: readonly string[] }) {
  const [open, setOpen] = useState(false);
  const queue = !v.isArray;
  if (v.size === 0) return <span className={s.empty}>{queue ? 'vacía' : 'sin elementos'}</span>;
  const shown = open ? elements : elements.slice(0, MAX_SHOWN);
  const notReceived = v.size - elements.length;
  return (
    <span className={`${s.cells}${queue ? ` ${s.cellsQueue}` : ''}`}>
      {/* en un arreglo cada celda lleva su indice; en una cola solo se marca el frente */}
      {shown.map((e, i) => (
        <Cell key={i} value={e} note={queue ? (i === 0 ? 'frente' : ' ') : String(i)} flash={!queue} />
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
      <span><i className="punto" style={{ background: writer.color }} />{writer.name}</span>
      {v.lastWriteInstant !== null && <span className={s.writerWhen}>inst. {v.lastWriteInstant}</span>}
    </span>
  );
}
