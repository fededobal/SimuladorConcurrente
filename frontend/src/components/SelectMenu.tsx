import type { ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Popover } from './Popover';

/** Una opcion del menu: su valor, como se llama y, si hace falta, que significa. */
export interface SelectOption<T> {
  readonly value: T;
  readonly label: string;
  readonly hint?: string;
}

interface Props<T> {
  /** Que se elige ("Velocidad", "Turnos"): nombre accesible y titulo del panel. */
  readonly name: string;
  readonly title: string;
  readonly icon: ReactNode;
  readonly value: T;
  readonly options: readonly SelectOption<T>[];
  readonly onChange: (value: T) => void;
}

/**
 * Menu compacto de una sola eleccion: el boton muestra el valor actual y, al abrirlo, las
 * opciones con su explicacion. Reemplaza a los select con rotulo, que ocupaban el doble.
 */
export function SelectMenu<T extends string | number>({
  name, title, icon, value, options, onChange,
}: Props<T>) {
  const current = options.find((o) => o.value === value);
  return (
    <Popover
      className="btn"
      label={<>{icon}{current?.label ?? String(value)}<ChevronDown size={13} /></>}
      ariaLabel={`${name}: ${current?.label ?? value}`}
      title={title}
    >
      {(close) => (
        <div className="menu" role="menu" aria-label={name}>
          <p className="menu-titulo">{name}</p>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="menuitemradio"
              aria-checked={o.value === value}
              className={`menu-item${o.value === value ? ' actual' : ''}`}
              onClick={() => { onChange(o.value); close(); }}
            >
              <span className="menu-item-texto">
                {o.label}
                {o.hint && <small>{o.hint}</small>}
              </span>
              {o.value === value && <Check size={14} style={{ marginLeft: 'auto' }} />}
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}
