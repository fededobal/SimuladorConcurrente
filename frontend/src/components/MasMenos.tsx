/**
 * Cuantos elementos se muestran de cualquier lista que pueda desbordarse (nombres de
 * procesos, celdas de un arreglo o una cola, etiquetas en un renglon del editor) antes de
 * ofrecer abrirla entera.
 */
export const MAX_VISIBLES = 5;

interface Props {
  readonly abierta: boolean;
  /** Cuantos elementos faltan ver; el texto por defecto es "+n más". */
  readonly faltan: number;
  /** Texto del boton cuando esta plegado, si no sirve el de por defecto. */
  readonly texto?: string;
  readonly onClick: () => void;
}

/** Boton para abrir o plegar una lista recortada. */
export function MasMenos({ abierta, faltan, texto, onClick }: Props) {
  return (
    <button type="button" className="mon-mas-nombres" onClick={onClick} aria-expanded={abierta}>
      {abierta ? 'ver menos' : (texto ?? `+${faltan} más`)}
    </button>
  );
}
