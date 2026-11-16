/**
 * Color para escribir el nombre de un proceso. La paleta sale del nucleo con tonos medios,
 * pensados para fondo claro; sobre fondo oscuro no se leen. En vez de una segunda paleta,
 * el tema decide cuanto blanco se le mezcla (`--proc-text-mix` en index.css): nada en el
 * claro y lo justo en el oscuro para que el texto pase 4,5:1. Los rellenos (franjas,
 * tramos, puntos) usan el color tal cual.
 */
export function processTextColor(color: string): string {
  return `color-mix(in oklab, ${color} var(--proc-text-mix), white)`;
}
