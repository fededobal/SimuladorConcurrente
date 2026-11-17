import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import s from './ShortcutsDialog.module.css';

interface Props {
  readonly open: boolean;
  readonly onClose: () => void;
}

/** Atajos por grupo: las teclas y lo que hacen. */
const GROUPS: readonly { title: string; items: readonly [string[], string][] }[] = [
  {
    title: 'Simulación',
    items: [
      [['F5'], 'Ejecutar o pausar'],
      [['F10'], 'Avanzar un instante (Paso)'],
      [['Shift', 'F5'], 'Detener y volver al principio'],
    ],
  },
  {
    title: 'Editor',
    items: [
      [['Tab'], 'Sangrar la línea o las líneas seleccionadas'],
      [['Shift', 'Tab'], 'Quitar un nivel de sangría'],
      [['Ctrl o Cmd', '/'], 'Comentar o descomentar las líneas seleccionadas'],
      [['Enter'], 'Línea nueva con la sangría de la anterior'],
    ],
  },
  {
    title: 'Pantalla',
    items: [
      [['?'], 'Abrir esta lista (con el cursor fuera del código)'],
      [['Esc'], 'Cerrar un menú o esta lista'],
      [['Esc'], 'Volver la línea de tiempo ampliada a su lugar'],
      [['← →', '↑ ↓'], 'Con el borde de un panel seleccionado, cambiar su tamaño'],
    ],
  },
];

/**
 * Lista de atajos de teclado, en un dialogo modal nativo: el navegador se ocupa de atrapar
 * el foco y de cerrarlo con Escape.
 */
export function ShortcutsDialog({ open, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className={s.dialog} aria-labelledby="atajos-titulo" onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className={s.head}>
        <h2 id="atajos-titulo">Atajos de teclado</h2>
        <button type="button" className="btn btn-icono btn-plano btn-chico" onClick={onClose} aria-label="Cerrar">
          <X size={15} />
        </button>
      </div>
      <div className={s.body}>
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h3>{group.title}</h3>
            <dl className={s.list}>
              {group.items.map(([keys, what]) => (
                <div key={what} style={{ display: 'contents' }}>
                  <dt>{keys.map((k, i) => <span key={k}>{i > 0 && ' + '}<kbd>{k}</kbd></span>)}</dt>
                  <dd>{what}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <p className={s.more}>
          La lista completa está en la guía: <a href="/docs/referencia/atajos" target="_blank" rel="noreferrer">Atajos de teclado</a>.
        </p>
      </div>
    </dialog>
  );
}
