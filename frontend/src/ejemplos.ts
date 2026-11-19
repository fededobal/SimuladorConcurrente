// Los programas de ejemplo viven en ejemplos/ (raiz del repo): son los mismos que corren
// EjemplosTest y el smoke del motor, asi que todo lo que ofrece el menu esta probado.
// Vite los incluye como texto al compilar.
const archivos = import.meta.glob<string>('../../ejemplos/*.mon', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export interface Ejemplo {
  readonly id: string;
  readonly titulo: string;
  readonly codigo: string;
}

/** La linea "// espera: ..." que leen EjemplosTest y el smoke; al alumno no le sirve. */
const ESPERA = /^\/\/\s*espera:/;

/** El texto como lo ve el alumno: sin la segunda linea si es la de "// espera:". */
function visible(texto: string): string {
  const lineas = texto.split('\n');
  return ESPERA.test(lineas[1] ?? '') ? [lineas[0], ...lineas.slice(2)].join('\n') : texto;
}

/**
 * Ejemplos en orden de archivo. La primera linea ("// titulo") da el nombre del menu. La
 * segunda se oculta solo si es la de "// espera:": si un ejemplo no la tuviera, descartarla
 * a ciegas se comeria una linea de codigo.
 */
export const EJEMPLOS: readonly Ejemplo[] = Object.entries(archivos)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([ruta, texto]) => {
    return {
      id: ruta.slice(ruta.lastIndexOf('/') + 1).replace(/\.mon$/, ''),
      titulo: texto.split('\n')[0].replace(/^\/\/\s*/, ''),
      codigo: visible(texto),
    };
  });

// Versiones anteriores de los ejemplos (ejemplos/anteriores/<ejemplo>.<n>.mon): sirven para
// reconocer la copia vieja de un ejemplo que quedo guardada en el navegador (exampleUpdates).
const archivosAnteriores = import.meta.glob<string>('../../ejemplos/anteriores/*.mon', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Una version anterior de un ejemplo, como la veia el alumno. */
export interface EjemploAnterior {
  /** Id del ejemplo al que pertenece. */
  readonly id: string;
  readonly codigo: string;
}

export const EJEMPLOS_ANTERIORES: readonly EjemploAnterior[] = Object.entries(archivosAnteriores)
  .map(([ruta, texto]) => ({
    id: ruta.slice(ruta.lastIndexOf('/') + 1).replace(/\.\d+\.mon$/, ''),
    codigo: visible(texto),
  }));
