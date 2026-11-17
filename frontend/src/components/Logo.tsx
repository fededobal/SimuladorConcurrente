interface Props {
  readonly size?: number;
}

/** Marca del simulador: tres procesos frente a un monitor. Igual a public/favicon.svg. */
export function Logo({ size = 22 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--accent-fill)" />
      <rect x="12.5" y="7.5" width="7" height="7" rx="1.8" fill="#fff" fillOpacity=".62" />
      <rect x="7.5" y="17" width="7" height="7" rx="1.8" fill="#fff" fillOpacity=".82" />
      <rect x="17.5" y="17" width="7" height="7" rx="1.8" fill="#fff" />
    </svg>
  );
}
