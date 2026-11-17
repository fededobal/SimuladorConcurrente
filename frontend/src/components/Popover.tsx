import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

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

/**
 * Boton que despliega un panel debajo (un menu de opciones). Se cierra con Escape, con un
 * clic afuera o cuando el contenido llama a `close`; al cerrarse con el teclado, el foco
 * vuelve al boton.
 */
export function Popover({
  label, className = 'btn', title, ariaLabel, disabled = false, align = 'left', onOpen, children,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

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
        <div id={panelId} className={`popover-panel popover-${align}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
