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

/**
 * Ejemplos en orden de archivo. La primera linea ("// titulo") da el nombre del menu. La
 * segunda se oculta solo si es la de "// espera:": si un ejemplo no la tuviera, descartarla
 * a ciegas se comeria una linea de codigo.
 */
export const EJEMPLOS: readonly Ejemplo[] = Object.entries(archivos)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([ruta, texto]) => {
    const lineas = texto.split('\n');
    const visibles = ESPERA.test(lineas[1] ?? '') ? [lineas[0], ...lineas.slice(2)] : lineas;
    return {
      id: ruta.slice(ruta.lastIndexOf('/') + 1).replace(/\.mon$/, ''),
      titulo: lineas[0].replace(/^\/\/\s*/, ''),
      codigo: visibles.join('\n'),
    };
  });
