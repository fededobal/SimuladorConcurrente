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

### Eliminado
- Quitar las skills de terceros "caveman" y sus copias duplicadas. (Federico Dobal, 2026-09-18)

### Interno
- Incorporar reglas del repositorio, hooks de git, integración continua, registro de cambios
  y configuración de Claude Code. (Federico Dobal, 2026-09-18)
- Registrar la huella del núcleo en `simulador.hash` al regenerar el motor, y sumar los
  scripts `smoke` y `check` al frontend. (Federico Dobal, 2026-09-18)
- Agregar tests de regresión para los bugs B1 a B6 de la revisión (desactivados hasta
  arreglarlos) y tests del contrato del puente `SimuladorJs`. (Federico Dobal, 2026-09-18)

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
