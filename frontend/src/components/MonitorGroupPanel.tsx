import { useState, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { IndexedName } from './IndexedName';
import { Popover } from './Popover';
import { arrayLabel, byUsage, usageOf, usageText, type MonitorGroup } from '../monitorGroups';
import type { MonitorView } from '../types';
import { useReorderSlide } from '../useReorderSlide';
import s from './MonitorGroupPanel.module.css';

interface Props {
  readonly group: MonitorGroup;
  /** Nombre del monitor elegido en el selector, o null si se muestran todos. */
  readonly picked: string | null;
  readonly onPick: (monitorName: string | null) => void;
  /** Dibuja la tarjeta de un monitor del vector. */
  readonly renderCard: (monitor: MonitorView) => ReactNode;
}

/** Monitores que se muestran con "Todos" antes de ofrecer ver el resto. */
const MAX_MONITORS = 5;

/**
 * Panel de un vector de monitores (`monitor Escritorio[id: 0..2]`): un selector elige cual
 * se mira. Con "Todos" se muestran ordenados por uso, primero el que tiene mas procesos
 * entre sus tres zonas, asi el que tiene actividad no queda perdido debajo de los que estan
 * libres; con muchos, se muestran los primeros y un boton abre el resto.
 */
export function MonitorGroupPanel({ group, picked, onPick, renderCard }: Props) {
  const [open, setOpen] = useState(false);
  const label = arrayLabel(group);
  const chosen = picked === null ? undefined : group.monitors.find((m) => m.name === picked);
  const sorted = chosen ? [chosen] : byUsage(group.monitors);
  const shown = open ? sorted : sorted.slice(0, MAX_MONITORS);
  const hidden = sorted.length - shown.length;
  const listRef = useReorderSlide(shown.map((m) => m.name));

  return (
    <section className={s.group} aria-label={`Vector de monitores ${label}`}>
      <header className={s.head}>
        <IndexedName name={label} className={s.name} />
        <span className={s.tag}>{group.monitors.length} monitores</span>
        <span className={s.picker}>
          <Popover
            className="btn btn-chico"
            align="right"
            label={<><IndexedName name={chosen ? chosen.name : 'Todos'} className={s.pickerValue} /><ChevronDown size={13} /></>}
            ariaLabel={`Monitor de ${label} que se muestra: ${chosen ? chosen.name : 'todos'}`}
            title="Elegir qué monitor del vector se muestra"
          >
            {(close) => (
              <div className="menu" role="menu" aria-label={`Monitores de ${label}`}>
                <p className="menu-titulo">Qué monitor mostrar</p>
                <Option current={!chosen} onClick={() => { onPick(null); close(); }}
                  name="Todos" note="ordenados por uso" />
                {group.monitors.map((m) => (
                  <Option key={m.name} current={chosen === m} mono
                    onClick={() => { onPick(m.name); close(); }}
                    name={m.name} note={usageText(usageOf(m))} />
                ))}
              </div>
            )}
          </Popover>
        </span>
      </header>
      {!chosen && group.monitors.length > 1 && (
        <p className={s.order}>Ordenados por uso: primero el que tiene más procesos compitiendo, ejecutando o bloqueados.</p>
      )}

      <div className={s.cards} ref={listRef}>
        {shown.map((m) => <div key={m.name} data-key={m.name}>{renderCard(m)}</div>)}
      </div>

      {(hidden > 0 || (open && sorted.length > MAX_MONITORS)) && (
        <div className={s.moreRow}>
          <button type="button" className="btn btn-chico" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? `Ver solo los ${MAX_MONITORS} más usados` : `Ver ${hidden} ${hidden === 1 ? 'monitor' : 'monitores'} más`}
          </button>
        </div>
      )}
    </section>
  );
}

interface OptionProps {
  readonly name: string;
  readonly note: string;
  readonly current: boolean;
  /** true si el nombre es el de un monitor: va con la letra del codigo. */
  readonly mono?: boolean;
  readonly onClick: () => void;
}

/** Una opcion del selector: el nombre y, a la derecha, cuantos procesos tiene. */
function Option({ name, note, current, mono = false, onClick }: OptionProps) {
  return (
    <button type="button" role="menuitemradio" aria-checked={current}
      className={`menu-item${current ? ' actual' : ''}`} onClick={onClick}>
      {mono ? <IndexedName name={name} className="menu-item-nombre" /> : <span>{name}</span>}
      <span className="menu-item-nota">{note}</span>
      <Check size={14} className={current ? undefined : s.noCheck} />
    </button>
  );
}
