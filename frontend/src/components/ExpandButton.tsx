import { Maximize2, Minimize2 } from 'lucide-react';

interface Props {
  readonly expanded: boolean;
  readonly onClick: () => void;
}

/** Boton del encabezado de un panel: lo amplia al costado del editor, o lo vuelve a su lugar. */
export function ExpandButton({ expanded, onClick }: Props) {
  const label = expanded ? 'Volver el panel a su lugar' : 'Ampliar el panel';
  return (
    <button
      type="button"
      className="amp"
      onClick={onClick}
      aria-label={label}
      aria-pressed={expanded}
      title={expanded ? `${label} (Esc)` : label}
    >
      {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
    </button>
  );
}
