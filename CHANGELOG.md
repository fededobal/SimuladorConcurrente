# Registro de cambios

Todos los cambios del proyecto quedan registrados en este archivo, con su autor y fecha.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las versiones
siguen [Versionado Semántico](https://semver.org/lang/es/).

Reglas:
- Cada commit agrega al menos una entrada en **[Sin publicar]** (excepto los de tipo `style`).
  El hook `commit-msg` lo verifica.
- Formato de entrada: `- Descripción en infinitivo o sustantivo, terminada en punto. (Autor, AAAA-MM-DD)`
- El autor es el nombre configurado en git (`git config user.name`).
- Secciones: Agregado, Cambiado, Corregido, Eliminado, Documentación, Interno.
- Al publicar una versión, **[Sin publicar]** pasa a llamarse `[X.Y.Z] - AAAA-MM-DD` y se
  abre una sección nueva vacía.

## [Sin publicar]

### Agregado
- Menú "Ejemplos" en la barra para cargar los programas de `ejemplos/`. Si el editor tiene un
  programa propio, pide confirmación antes de reemplazarlo. (Federico Dobal, 2026-09-18)
- Selector de política de planificación: turnos al azar o en ronda (*round robin*). Se puede
  cambiar en medio de una ejecución. (Federico Dobal, 2026-09-18)
- Declarar varias variables del mismo tipo en una línea: `text lista, comp;`,
  `int i = 0, j;`. Cada nombre lleva su propio tamaño y valor inicial. (Federico Dobal, 2026-09-23)
- Ejemplo del corralón (práctica de monitores, punto 4a): un empleado atiende a los clientes
  en orden de llegada. (Federico Dobal, 2026-09-23)

### Cambiado
- Títulos más cortos para los programas del menú "Ejemplos". (Federico Dobal, 2026-09-21)

### Corregido
- Liberar el monitor cuando un proceso falla dentro de un procedimiento; antes la simulación
  se informaba como interbloqueo. (Federico Dobal, 2026-09-18)
- Informar el desborde de un entero como error de ejecución con su línea; antes la interfaz
  mostraba `Error: null`. (Federico Dobal, 2026-09-18)
- Devolver como error, y no como excepción, una falla al inicializar las variables de un
  monitor. Ninguna función del motor lanza excepciones hacia la interfaz. (Federico Dobal, 2026-09-18)
- `++` y `--` sobre un `double` (variable o elemento de arreglo) suman o restan 1.0 en lugar
  de truncar el valor. (Federico Dobal, 2026-09-18)
- Un número entero demasiado grande en el programa es un error de compilación en español y
  con su línea. (Federico Dobal, 2026-09-18)
- Evitar que la memoria crezca sin tope en ejecuciones largas: los eventos ya no guardan el
  estado completo y el registro conserva los últimos 2000. Con 50 procesos y 2000 pasos, el
  consumo pasa de unos 1000 MB a menos de 2 MB. (Federico Dobal, 2026-09-18)
- Tab sangra también una línea en blanco; antes no hacía nada si el renglón estaba vacío.
  (Federico Dobal, 2026-09-23)
- Una `ColaOrdenada` local de un proceso se reconoce como declaración. (Federico Dobal, 2026-09-23)
- El menú "Ejemplos" oculta la segunda línea solo si es la de `// espera:`; antes la descartaba
  siempre y un ejemplo sin ella perdía una línea de código. (Federico Dobal, 2026-09-23)

### Eliminado
- Quitar el texto de ayuda del panel de salida cuando todavía no hay nada escrito.
  (Federico Dobal, 2026-09-21)
- Quitar de la barra la semilla visible y el campo para fijarla, agregados en esta misma
  versión; cada corrida vuelve a usar una semilla nueva sin mostrarla. (Federico Dobal, 2026-09-18)
- Quitar el botón "Compartir" de la barra, que se había agregado en esta misma versión.
  (Federico Dobal, 2026-09-18)
- Sacar de `main` el prototipo de semáforos (`legacy/`); queda en el tag de git
  `prototipo-semaforos`. (Federico Dobal, 2026-09-18)
- Quitar la skill `nuevo-concepto-concurrencia` y las menciones a otros conceptos de
  concurrencia en las reglas del repositorio. (Federico Dobal, 2026-09-18)
- Eliminar la API REST de Spring Boot, que la interfaz no usaba desde que el motor corre en
  el navegador. El núcleo queda sin dependencias de Spring. (Federico Dobal, 2026-09-18)
- Quitar las skills de terceros "caveman" y sus copias duplicadas. (Federico Dobal, 2026-09-18)

### Documentación
- Registrar en el ADR 0003 que el alcance del simulador es solo monitores y cuáles son las
  funcionalidades previstas; el ADR 0002 queda reemplazado. (Federico Dobal, 2026-09-18)
- Sincronizar el README con la versión sin servidor (interfaz actual, carpetas, ejemplos,
  semilla, política y enlaces) y corregir la definición de instante en la referencia y la
  especificación del lenguaje: evaluar una guarda no consume un paso. (Federico Dobal, 2026-09-18)
- Describir en el README los seis controles de la barra. (Federico Dobal, 2026-09-18)
- README más breve: qué permite hacer el simulador y cómo correrlo, sin enlaces a `docs/`.
  (Federico Dobal, 2026-09-23)

### Interno
- Ignorar en git la carpeta `.ua/`, donde Understand-Anything guarda el grafo de
  conocimiento local del proyecto. (Federico Dobal, 2026-09-21)
- Incorporar reglas del repositorio, hooks de git, integración continua, registro de cambios
  y configuración de Claude Code. (Federico Dobal, 2026-09-18)
- Registrar la huella del núcleo en `simulador.hash` al regenerar el motor, y sumar los
  scripts `smoke` y `check` al frontend. (Federico Dobal, 2026-09-18)
- Agregar tests de regresión para los bugs B1 a B6 de la revisión (desactivados hasta
  arreglarlos) y tests del contrato del puente `SimuladorJs`. (Federico Dobal, 2026-09-18)
- Verificar en cada push y PR los tests del núcleo, que el motor esté al día y que el
  frontend compile sin errores de lint. (Federico Dobal, 2026-09-18)
- Renombrar la carpeta `backend/` a `nucleo/`: sin servidor, contiene el motor del
  simulador que se compila a JavaScript. (Federico Dobal, 2026-09-18)
- Reunir los programas de ejemplo en `ejemplos/`, con el resultado esperado en su encabezado,
  y verificarlos con 25 semillas en JUnit y en el smoke del motor. (Federico Dobal, 2026-09-18)
- El hook `pre-commit` acepta un cambio del núcleo cuyo motor regenerado sale idéntico, y
  exige en cambio que no queden cambios del motor sin agregar al commit. (Federico Dobal, 2026-09-18)
- Dejar `docs/` fuera del repositorio: se ignora y se deja de seguir, pero los archivos quedan
  en la copia local. (Federico Dobal, 2026-09-23)

## [0.1.0] - 2026-09-17

Reconstruido a partir del historial de git; varios commits no tenían descripción.

### Agregado
- Prototipo inicial del simulador basado en semáforos. (Federico Dobal, 2026-05-21)
- Tipo `double` y sintaxis sin distinción de mayúsculas en el prototipo. (Federico Dobal, 2026-05-22)
- Reestructuración a simulador de monitores con núcleo Java y frontend React. (Federico Dobal, 2026-09-10)
- Reinicio de la interfaz para incorporar funciones de forma incremental. (Federico Dobal, 2026-09-17)

### Corregido
- Solo las variables simples muestran su valor antes y después. (Federico Dobal, 2026-05-22)
- Un proceso READY que va a bloquearse en el instante se muestra como BLOCKED. (Federico Dobal, 2026-07-28)
