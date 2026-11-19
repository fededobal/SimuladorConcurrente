import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
  /** Contenido del boton que abre el menu. */
  readonly label: ReactNode;
  /** Clases del boton (las mismas que cualquier boton de la barra). */
  readonly className?: string;
  readonly title?: string;
  readonly ariaLabel?: string;
  readonly disabled?: boolean;
  /** Borde del boton con el que se alinea el panel. */
  readonly align?: 'left' | 'right';
  /** Se llama al abrir, antes de mostrar el panel. */
  readonly onOpen?: () => void;
  /** Contenido del panel; recibe `close` para cerrarlo al elegir una opcion. */
  readonly children: (close: () => void) => ReactNode;
}

/** Aire entre el panel y el borde de la ventana, en px. */
const WINDOW_MARGIN = 8;

/**
 * Boton que despliega un panel debajo (un menu de opciones). Se cierra con Escape, con un
 * clic afuera o cuando el contenido llama a `close`; al cerrarse con el teclado, el foco
 * vuelve al boton. Si el panel no entra en la ventana alineado con su boton (una ventana
 * angosta, un menu con nombres largos), se corre lo justo para quedar adentro.
 */
export function Popover({
  label, className = 'btn', title, ariaLabel, disabled = false, align = 'left', onOpen, children,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Al abrir: si el panel se sale de la ventana, se lo corre. Se calcula con el ancho del
  // panel y el lugar del boton, no con el rectangulo del panel, que esta a mitad de su
  // animacion de entrada.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const root = rootRef.current;
    if (!open || !panel || !root) return;
    const anchor = root.getBoundingClientRect();
    const left = align === 'left' ? anchor.left : anchor.right - panel.offsetWidth;
    const right = left + panel.offsetWidth;
    const limit = document.documentElement.clientWidth - WINDOW_MARGIN;
    const shift = right > limit ? Math.max(limit - right, WINDOW_MARGIN - left)
      : left < WINDOW_MARGIN ? WINDOW_MARGIN - left : 0;
    // `translate` y no `transform`: la animacion de entrada usa transform
    panel.style.translate = shift === 0 ? '' : `${Math.round(shift)}px 0`;
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  const toggle = () => {
    if (!open) onOpen?.();
    setOpen(!open);
  };

  return (
    <div className="popover" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={className}
        title={title}
        aria-label={ariaLabel}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        disabled={disabled}
        onClick={toggle}
      >
        {label}
      </button>
      {open && (
        <div id={panelId} ref={panelRef} className={`popover-panel popover-${align}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
