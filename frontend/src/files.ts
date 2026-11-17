// Archivos del disco del alumno: descargar el programa como .mon y leer uno elegido.

/** Descarga `text` como un archivo de texto con ese nombre. */
export function downloadText(fileName: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // el navegador ya tomo el contenido al hacer clic
  URL.revokeObjectURL(url);
}

/** Tamano maximo de un archivo que se abre: un programa de la materia pesa unos pocos KB. */
export const MAX_FILE_BYTES = 200_000;

/** Lee un archivo de texto elegido por el alumno. Rechaza los que no pueden ser un programa. */
export async function readTextFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`El archivo pesa ${Math.round(file.size / 1000)} KB: es demasiado grande para ser un programa.`);
  }
  const text = await file.text();
  if (text.includes('\0')) throw new Error('El archivo no es de texto.');
  return text.replace(/\r\n?/g, '\n');
}
