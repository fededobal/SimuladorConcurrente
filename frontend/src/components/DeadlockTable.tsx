import { useState } from 'react';
import { placeOf, wakeOf, type BlockedProcess } from '../deadlock';
import { processTextColor } from '../processColor';
import s from './Inspector.module.css';

interface Props {
  readonly blocked: readonly BlockedProcess[];
}

/** Procesos bloqueados que se listan antes de ofrecer ver el resto. */
const MAX_ROWS = 8;

/**
 * "Por que nadie avanza": cada proceso bloqueado del deadlock, donde esta y que lo
 * despertaria. Es la tabla que el alumno armaba a mano mirando el dibujo de cada monitor.
 * Con muchos bloqueados muestra los primeros y un boton abre el resto.
 */
export function DeadlockTable({ blocked }: Props) {
  const [open, setOpen] = useState(false);
  if (blocked.length === 0) return null;
  const shown = open ? blocked : blocked.slice(0, MAX_ROWS);
  return (
    <section className={s.why} aria-label="Por qué nadie avanza">
      <h3>Por qué nadie avanza</h3>
      <table>
        <thead>
          <tr><th>Proceso</th><th>Dónde está</th><th>Lo despierta</th></tr>
        </thead>
        <tbody>
          {shown.map((b) => (
            <tr key={b.id}>
              <td>
                <i className="punto" style={{ background: b.color }} />
                <span style={{ color: processTextColor(b.color) }}>{b.name}</span>
              </td>
              <td data-label="Dónde está">{placeOf(b)}{b.holding.length > 0 && `; retiene ${b.holding.join(', ')}`}</td>
              <td data-label="Lo despierta">{wakeOf(b)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {blocked.length > MAX_ROWS && (
        <p className={s.whyMore}>
          <button type="button" className="btn btn-chico" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? 'Ver menos' : `Ver los otros ${blocked.length - MAX_ROWS} procesos bloqueados`}
          </button>
        </p>
      )}
    </section>
  );
}
