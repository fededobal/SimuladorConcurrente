import { useLayoutEffect, useState, type RefObject } from 'react';

/** Metrica del texto del editor, en px: donde empieza el primer renglon y cuanto mide cada uno. */
export interface LineMetrics {
  /** Distancia del borde superior del area al primer renglon. */
  readonly top: number;
  /** Alto de un renglon. */
  readonly lineHeight: number;
  /** Ancho de un caracter (la tipografia del codigo es monoespaciada). */
  readonly charWidth: number;
}

// Valores de arranque, iguales a --pad-top y --line-h de index.css. No se usan para
// posicionar: apenas monta, se miden los reales del DOM. Duplicar la metrica en el CSS y en
// el JS es como se desalinean las marcas cuando una de las dos cambia.
const INITIAL: LineMetrics = { top: 14, lineHeight: 22, charWidth: 7.8 };

/** Un span de ancho y alto cero: su posicion es la del renglon en el que cae. */
function makeProbe(): HTMLSpanElement {
  const probe = document.createElement('span');
  probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:top;';
  return probe;
}

/** Ancho de un caracter con la tipografia de la capa, medido sobre una tira larga. */
function measureCharWidth(layer: HTMLElement): number | null {
  const SAMPLE = 40;
  const ruler = document.createElement('span');
  ruler.textContent = '0'.repeat(SAMPLE);
  ruler.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;';
  layer.appendChild(ruler);
  const width = ruler.getBoundingClientRect().width / SAMPLE;
  ruler.remove();
  return width > 0 ? width : null;
}

/**
 * Posicion real de los renglones, medida con dos spans efimeros en vez de confiar en
 * getComputedStyle: con line-height fraccionario, zoom o otra tipografia el calculo a mano
 * se corre un poco por renglon y termina desalineado varias lineas mas abajo. El segundo
 * span va justo despues del primer salto de linea, o sea al inicio del segundo renglon.
 */
function measureLines(layer: HTMLElement): { top: number; lineHeight: number } | null {
  const first = makeProbe();
  const second = makeProbe();
  layer.insertBefore(first, layer.firstChild);

  let placed = false;
  const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const newline = (node.textContent ?? '').indexOf('\n');
    if (newline >= 0) {
      const after = node.splitText(newline + 1);
      after.parentNode?.insertBefore(second, after);
      placed = true;
      break;
    }
  }

  let result: { top: number; lineHeight: number } | null = null;
  if (placed) {
    const area = (layer.offsetParent ?? layer.parentElement)?.getBoundingClientRect();
    const r0 = first.getBoundingClientRect();
    const r1 = second.getBoundingClientRect();
    if (area && r1.top - r0.top > 0) result = { top: r0.top - area.top, lineHeight: r1.top - r0.top };
  }
  first.remove();
  second.remove();
  // reune los nodos de texto que partio splitText
  layer.normalize();
  if (result) return result;

  // contenido de un solo renglon: no hay segundo span que medir
  const cs = getComputedStyle(layer);
  const lineHeight = parseFloat(cs.lineHeight);
  const top = parseFloat(cs.paddingTop);
  return Number.isFinite(lineHeight) && lineHeight > 0 && Number.isFinite(top) ? { top, lineHeight } : null;
}

/** Mide la capa pintada del editor y se actualiza cuando cambia de tamano (zoom, tipografia). */
export function useLineMetrics(layerRef: RefObject<HTMLElement | null>): LineMetrics {
  const [metrics, setMetrics] = useState<LineMetrics>(INITIAL);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const measure = () => {
      const lines = measureLines(layer);
      const charWidth = measureCharWidth(layer);
      setMetrics((prev) => {
        const next: LineMetrics = {
          top: lines?.top ?? prev.top,
          lineHeight: lines?.lineHeight ?? prev.lineHeight,
          charWidth: charWidth ?? prev.charWidth,
        };
        return next.top === prev.top && next.lineHeight === prev.lineHeight
          && next.charWidth === prev.charWidth ? prev : next;
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(layer);
    return () => observer.disconnect();
  }, [layerRef]);

  return metrics;
}
