import { processTextColor } from '../processColor';
import type { TimelineColumn } from '../timeline';
import type { LogEntry } from '../types';
import s from './Timeline.module.css';

interface Props {
  readonly column: TimelineColumn;
  readonly left: number;
  readonly top: number;
}

/** Eventos del instante que se listan; el resto se resume. */
const MAX_EVENTS = 6;

/** Lo que paso en un instante, en palabras: los eventos del paso, con el proceso en su color. */
export function InstantCard({ column, left, top }: Props) {
  const events = column.events;
  const shown = events.slice(0, MAX_EVENTS);
  return (
    <div className={s.card} style={{ left, top }} role="status">
      <b>Instante {column.instant}</b>
      {events.length === 0 && <div className={s.nobody}>Nadie avanzó en este instante.</div>}
      {shown.map((e) => <EventLine key={e.id} e={e} />)}
      {events.length > shown.length && (
        <div className={s.nobody}>… y {events.length - shown.length} más</div>
      )}
    </div>
  );
}

/** Un evento del log, "Nombre: texto": el nombre con el color del proceso. */
function EventLine({ e }: { e: LogEntry }) {
  const i = e.message.indexOf(': ');
  if (e.processId === null || i < 0) return <div>{e.message}</div>;
  return (
    <div>
      <span className={s.who} style={{ color: e.processColor ? processTextColor(e.processColor) : undefined }}>
        {e.message.slice(0, i)}
      </span>
      {' '}{e.message.slice(i + 2)}
    </div>
  );
}
