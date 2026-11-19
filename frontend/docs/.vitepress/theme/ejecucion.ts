// El motor del simulador, para los ejemplos que se ejecutan en la guia.
//
// Se carga recien cuando alguien aprieta Ejecutar o Paso: quien solo lee no lo descarga. El
// motor admite una simulacion por pestaña, asi que corre un bloque por vez: el que arranca
// le avisa al anterior que perdio el motor, y ese vuelve a quedar sin ejecutar.

type Api = typeof import('../../../src/api')['api'];

let cargando: Promise<Api> | null = null;

/** El motor, cargado la primera vez que se lo pide. */
export function cargarMotor(): Promise<Api> {
  cargando ??= import('../../../src/api').then((m) => m.api);
  return cargando;
}

/** Lo que hace el bloque que tiene el motor cuando otro se lo saca. */
let alPerderlo: (() => void) | null = null;

/**
 * Un bloque toma el motor para ejecutar su programa. Si lo tenia otro, se le avisa antes
 * (deja de ejecutar y borra sus marcas).
 *
 * @param aviso lo que hace este bloque cuando otro le saque el motor
 */
export function tomarMotor(aviso: () => void): void {
  if (alPerderlo && alPerderlo !== aviso) alPerderlo();
  alPerderlo = aviso;
}

/** El bloque deja el motor por su cuenta (se reinicio o salio de la pagina). */
export function soltarMotor(aviso: () => void): void {
  if (alPerderlo === aviso) alPerderlo = null;
}

/** Semilla nueva para una ejecucion, de cinco cifras como las del simulador. */
export function semillaNueva(): number {
  return 10000 + Math.floor(Math.random() * 90000);
}

/** El programa que viaja en el atributo del bloque, en base64 para URL (ver markdown.ts). */
export function decodificar(base64: string): string {
  const binario = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(binario, (c) => c.charCodeAt(0)));
}
