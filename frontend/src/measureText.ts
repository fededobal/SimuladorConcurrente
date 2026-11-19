// Ancho de un texto en pantalla, medido con un canvas. Se mide de verdad en vez de
// estimarlo por cantidad de caracteres: una estimacion con margen descartaba rotulos que
// entraban.

/** Ancho aproximado de un caracter, por si no hay canvas para medir. */
const CHAR_W = 6.8;

let ruler: CanvasRenderingContext2D | null | undefined;

/**
 * Ancho de `text` en px con esa tipografia.
 *
 * @param font la tipografia como en la propiedad `font` de CSS ("600 12px 'Inter', sans-serif")
 */
export function textWidth(text: string, font: string): number {
  if (ruler === undefined) ruler = document.createElement('canvas').getContext('2d');
  if (!ruler) return text.length * CHAR_W;
  ruler.font = font;
  return ruler.measureText(text).width;
}
