import { memo, useState } from 'react';
import { IndexedName } from './IndexedName';
import { MonitorDrawing } from './MonitorDrawing';
import { travelsOf } from '../monitorDiagram';
import { processTextColor } from '../processColor';
import { delayLeft } from '../processStates';
import type { CondView, LogEntry, MonitorView, ProcessView, ProcRef, VarView } from '../types';
import { useChangeCount } from '../useChangeCount';
import { useLingering } from '../useLingering';
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

// Topes de lo que se muestra de cada lista antes de ofrecer abrir el resto: sin ellos, una
// cola de cuarenta procesos o un arreglo de cien elementos estiran la tarjeta hasta que no
// se ve otra cosa.
/** Elementos de una cola o de un arreglo. */
const MAX_SHOWN = 6;
/** Variables condicion; con mas, se listan primero las que tienen procesos dormidos. */
const MAX_CONDS = 6;
/** Variables permanentes. */
const MAX_VARS = 8;
/** Caracteres del valor de una variable simple (un texto puede ser tan largo como se quiera). */
const MAX_VALUE_CHARS = 60;
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
        <Vars vars={monitor.vars} procRefs={procRefs} />
      </div>
    </section>
  );
}, (prev, next) => prev.monitor === next.monitor && prev.owner === next.owner
  && prev.procRefs === next.procRefs && prev.deadlocked === next.deadlocked
  && sameEvents(prev.events, next.events));

function sameEvents(a: readonly LogEntry[], b: readonly LogEntry[]): boolean {
  return a.length === b.length && a.every((e, i) => e.id === b[i].id);
}

/** Aclaracion sobre el dueno cuando no esta ejecutando: en delay, o demorado en otro monitor. */
function ownerNote(p: ProcessView | undefined): string {
  if (!p || p.state !== 'BLOCKED') return '';
  if (p.delayRemaining !== null) return `, en delay (${delayLeft(p.delayRemaining)})`;
  if (p.blockReason === 'COND_WAIT') return `, dormido en ${p.blockedOn ?? 'otro monitor'}`;
  return `, compite por ${p.blockedOn ?? 'otro monitor'}`;
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
 * muestra hasta MAX_CONDS de las que tienen a alguien dormido y cuenta las demas.
 */
function CondQueues({ conds }: { conds: readonly CondView[] }) {
  const [open, setOpen] = useState(false);
  const fold = conds.length > MAX_CONDS;
  const busy = conds.filter((c) => c.queue.length > 0);
  const shown = fold && !open ? busy.slice(0, MAX_CONDS) : conds;
  const hidden = conds.length - shown.length;
  // si entre las ocultas hay alguna con procesos, no se puede decir que estan vacias
  const allEmpty = busy.length <= MAX_CONDS;
  return (
    <>
      {shown.map((c) => <QueueRow key={c.name} name={c.name} procs={c.queue} />)}
      {fold && (
        <>
          <dt />
          <dd>
            <button type="button" className={s.more} onClick={() => setOpen(!open)} aria-expanded={open}
              title={open ? undefined : 'Mostrar todas las variables condición del monitor'}>
              {open ? 'ver menos' : `+${hidden} cond ${allEmpty ? 'vacías' : 'más'}`}
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
      <dt className={s.cond}><IndexedName name={name} /></dt>
      <dd><Queue procs={procs} /></dd>
    </>
  );
}

/**
 * Los procesos de una cola, en orden, como chips; "vacía" si no hay nadie. El que sale de la
 * cola se queda un momento y se achica hasta desaparecer: los de atras se corren a su lugar
 * en vez de saltar.
 */
function Queue({ procs }: { procs: readonly ProcRef[] }) {
  const [open, setOpen] = useState(false);
  const all = useLingering(procs, (p) => p.id);
  if (all.length === 0) return <span className={`${s.empty} ${s.fadeIn}`}>vacía</span>;
  const shown = open ? all : all.slice(0, MAX_SHOWN);
  return (
    <>
      {shown.map(({ item: p, leaving }) => (
        <span key={p.id} className={`${s.chip}${leaving ? ` ${s.chipOut}` : ''}`} aria-hidden={leaving || undefined}>
          <i className="punto" style={{ background: p.color }} />
          <IndexedName name={p.name} />
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
 * La tabla de variables permanentes. Con muchas, muestra las primeras y un boton abre el
 * resto.
 */
function Vars({ vars, procRefs }: { vars: readonly VarView[]; procRefs: ReadonlyMap<number, ProcRef> }) {
  const [open, setOpen] = useState(false);
  if (vars.length === 0) return <p className={s.empty}>Este monitor no tiene variables permanentes.</p>;
  const shown = open ? vars : vars.slice(0, MAX_VARS);
  return (
    <>
      <div className={s.varsWrap}>
        <table className={s.vars}>
          <thead>
            <tr><th>Nombre</th><th>Tipo</th><th>Valor</th><th>Escribió</th></tr>
          </thead>
          <tbody>
            {shown.map((v) => <VarRows key={v.name} v={v} procRefs={procRefs} />)}
          </tbody>
        </table>
      </div>
      {vars.length > MAX_VARS && (
        <p className={s.varsMore}>
          <button type="button" className={s.more} onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? 'ver menos' : `+${vars.length - MAX_VARS} variables más`}
          </button>
        </p>
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

/**
 * Valor de una variable simple; cuando cambia, se destaca un momento. Un texto largo se
 * corta y un boton lo muestra entero.
 */
function ScalarValue({ value }: { value: string }) {
  const [open, setOpen] = useState(false);
  const changes = useChangeCount(value);
  const long = value.length > MAX_VALUE_CHARS;
  return (
    <>
      <span key={changes} className={`${s.varValue}${changes > 0 ? ` ${s.changed}` : ''}`}
        title={long && !open ? value : undefined}>
        {long && !open ? `${value.slice(0, MAX_VALUE_CHARS)}…` : value}
      </span>
      {long && (
        <>
          {' '}
          <button type="button" className={s.more} onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? 'ver menos' : 'ver todo'}
          </button>
        </>
      )}
    </>
  );
}

/**
 * Celda de un arreglo o de una cola. En un arreglo, el elemento que cambia se destaca un
 * momento; en una cola no, porque al sacar el frente cambian todos los casilleros a la vez.
 */
function Cell({ value, note, flash }: { value: string; note: string; flash: boolean }) {
  const changes = useChangeCount(value);
  return (
    <span className={s.cell} title={value}>
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
      <span className={s.writerName} title={writer.name}>
        <i className="punto" style={{ background: writer.color }} />
        <span>{writer.name}</span>
      </span>
      {v.lastWriteInstant !== null && <span className={s.writerWhen}>inst. {v.lastWriteInstant}</span>}
    </span>
  );
}
