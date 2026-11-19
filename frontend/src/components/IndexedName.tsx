import s from './IndexedName.module.css';

interface Props {
  /** Nombre de un proceso, un monitor o una variable condicion: "Cliente[12]", "Banco". */
  readonly name: string;
  readonly className?: string;
}

/** Donde empieza el indice del final ("[12]", "[0..2]"), o -1 si el nombre no termina en uno. */
function indexStart(name: string): number {
  return name.endsWith(']') ? name.lastIndexOf('[') : -1;
}

/**
 * Un nombre que puede no entrar en su lugar. Si hay que abreviarlo se corta el nombre y el
 * indice queda siempre a la vista: en `ClientePreferencial…[12]` lo que distingue a un
 * proceso de otro es el final, y los puntos suspensivos comunes se lo comian. El nombre
 * completo va en el `title`.
 */
export function IndexedName({ name, className }: Props) {
  const cut = indexStart(name);
  return (
    <span className={`${s.name}${className ? ` ${className}` : ''}`} title={name}>
      <span className={s.base}>{cut > 0 ? name.slice(0, cut) : name}</span>
      {cut > 0 && <span className={s.index}>{name.slice(cut)}</span>}
    </span>
  );
}
