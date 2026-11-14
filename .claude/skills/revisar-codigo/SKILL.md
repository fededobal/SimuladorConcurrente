---
name: revisar-codigo
description: >
  Revisión de código específica del Simulador de Monitores: recorre un diff (staged, una
  rama o un PR) con una checklist ordenada por gravedad — semántica de monitores, puente
  Java→JS, errores que ve el alumno, tests, docs, higiene del repo — y devuelve hallazgos
  accionables con archivo, línea y arreglo propuesto. Usala cuando el usuario pida
  "revisá", "review", "¿está bien esto?", "antes de mergear", "/review", o al terminar un
  cambio de más de un archivo antes de proponer el commit.
---

# Revisar código

## Obtener el diff

```bash
git diff --staged            # lo que va a entrar
git diff main...HEAD         # la rama completa
```
Leé los archivos completos que el diff toca cuando el contexto importe (por ejemplo,
todos los caminos de salida de un monitor en `VirtualMachine`).

## Checklist, de más grave a menos

**1. Correctitud de la simulación** (skill `semantica-concurrencia`)
- ¿Todo camino de salida de un monitor lo libera con `releaseMonitor` (traspaso al primero
  de la cola de entrada, ADR 0005), después de registrar su evento de salida?
- ¿Se conserva *signal and continue*? ¿La reproducibilidad por semilla?
- ¿Algún error interno puede terminar mostrándose como `DEADLOCK`?

**2. Puente y motor** (skill `motor-java-js`)
- ¿Se tocó `lang/ vm/ js/`? ⇒ ¿están `simulador.js` y `simulador.hash` regenerados?
- ¿Alguna función `@JSExport` puede lanzar?
- ¿`Snapshot`/`LogEntry` ↔ `Json.java` ↔ `types.ts` siguen alineados?
- ¿APIs de Java que TeaVM puede no soportar?

**3. Lo que ve el alumno**
- Mensajes en español, con línea, sin nombres de clases Java ni stack traces.
- ¿El cambio se ve en la UI como corresponde? ¿Textos claros para alguien que aprende?

**4. Tests**
- ¿Hay test del comportamiento nuevo o del bug arreglado? ¿Con varias semillas si hay azar?
- ¿Se sacó el `@Disabled` de `RegresionesVmTest` y se movió el caso en `smoke-motor.mjs`?

**5. Docs** (skill `documentar-pps`)
- Cambio de lenguaje ⇒ la página de `docs/lenguaje/` que corresponda + `docs/lenguaje/especificacion.md`.
- Decisión de arquitectura ⇒ ADR en `docs/decisiones/`.
- ¿El README describe lo que realmente hay?

**6. Convenciones y registro** (skills `convenciones-codigo`, `commit`)
- Nombres, idioma, tamaño de métodos/clases, determinismo, sin dependencias nuevas.
- ¿Hay entrada en `CHANGELOG.md` con autor y fecha? ¿El mensaje tiene descripción?
- Si agrega una primitiva de sincronización que no es de monitores: el alcance es solo
  monitores (ADR 0003); señalarlo antes de revisar el resto.

**7. Higiene**
- Commits atómicos; nada de `__MACOSX`, `.DS_Store`, `target/`, `dist/`.
- Código muerto o comentado, `console.log`, TODOs sin contexto.

## Formato de salida

Agrupá por gravedad: **Bloqueante** (rompe la simulación, el deploy o el motor),
**Importante** (bug probable, falta test/doc), **Sugerencia**. Cada hallazgo:

```
[Bloqueante] vm/VirtualMachine.java:184 — el catch de RuntimeError no suelta el lock
  → llamar a liberarMonitores(p) antes de p.fail(...). Test: RegresionesVmTest#errorDentroDelMonitorLiberaElLock
```

Si no hay nada bloqueante, decilo explícitamente. Terminá con una línea: "Listo para
commitear" / "Arreglar antes: …". No reescribas código que no te pidieron; proponé.
