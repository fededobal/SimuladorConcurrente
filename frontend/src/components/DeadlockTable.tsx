import { placeOf, wakeOf, type BlockedProcess } from '../deadlock';
import { processTextColor } from '../processColor';
import s from './Inspector.module.css';

interface Props {
  readonly blocked: readonly BlockedProcess[];
}

/**
 * "Por que nadie avanza": cada proceso bloqueado del interbloqueo, donde esta y que lo
 * despertaria. Es la tabla que el alumno armaba a mano mirando el dibujo de cada monitor.
 */
export function DeadlockTable({ blocked }: Props) {
  if (blocked.length === 0) return null;
  return (
    <section className={s.why} aria-label="Por qué nadie avanza">
      <h3>Por qué nadie avanza</h3>
      <table>
        <thead>
          <tr><th>Proceso</th><th>Dónde está</th><th>Lo despierta</th></tr>
        </thead>
        <tbody>
          {blocked.map((b) => (
            <tr key={b.id}>
              <td>
                <i className="punto" style={{ background: b.color }} />
                <span style={{ color: processTextColor(b.color) }}>{b.name}</span>
              </td>
              <td>{placeOf(b)}{b.holding.length > 0 && `; retiene ${b.holding.join(', ')}`}</td>
              <td>{wakeOf(b)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
