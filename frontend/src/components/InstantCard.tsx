import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { processTextColor } from '../processColor';
import type { TimelineColumn } from '../timeline';
import { cardPosition, type Point } from '../timelineLayout';
import type { LogEntry } from '../types';
import s from './Timeline.module.css';

interface Props {
  readonly column: TimelineColumn;
  /** Donde estaba el puntero al elegir el instante, en px de la ventana. */
  readonly at: Point;
  /** La grilla de la linea de tiempo: mientras el puntero se mueve sobre ella, el cartel lo sigue. */
  readonly area: HTMLElement | null;
}

/** Eventos del instante que se listan; el resto se resume. */
const MAX_EVENTS = 6;

/**
 * Lo que paso en un instante, en palabras: los eventos del paso, con el proceso en su color.
 * Aparece al hacer clic en un instante y acompana al puntero, corrido hacia un costado: asi
 * nunca queda tapando la parte de la linea de tiempo que se esta mirando. Fuera de la grilla
 * se queda donde estaba.
 *
 * Va en un portal al final del documento, con posicion fija: dentro del panel la recortaria
 * su desplazamiento. El lugar se escribe directo en el estilo, sin pasar por el estado, para
 * no redibujar la linea de tiempo en cada movimiento del mouse.
 */
export function InstantCard({ column, at, area }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const pointer = useRef(at);

  const place = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { left, top } = cardPosition(pointer.current,
      { width: el.offsetWidth, height: el.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight });
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, []);

  // otro clic: el cartel va adonde esta el puntero ahora
  useLayoutEffect(() => {
    pointer.current = at;
    place();
  }, [at, place]);
  // otro instante cambia el alto del cartel, y con el si entra debajo del puntero
  useLayoutEffect(place, [column, place]);

  useEffect(() => {
    if (!area) return undefined;
    const follow = (e: MouseEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY };
      place();
    };
    area.addEventListener('mousemove', follow);
    window.addEventListener('resize', place);
    return () => {
      area.removeEventListener('mousemove', follow);
      window.removeEventListener('resize', place);
    };
  }, [area, place]);

  const events = column.events;
  const shown = events.slice(0, MAX_EVENTS);
  return createPortal(
    <div ref={ref} className={s.card} role="status">
      <b>Instante {column.instant}</b>
      {events.length === 0 && <div className={s.nobody}>Nadie avanzó en este instante.</div>}
      {shown.map((e) => <EventLine key={e.id} e={e} />)}
      {events.length > shown.length && (
        <div className={s.nobody}>… y {events.length - shown.length} más</div>
      )}
    </div>,
    document.body,
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
