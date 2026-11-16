---
name: commit
description: >
  Prepara y escribe commits del simulador: revisa el diff, lo parte en commits atómicos si
  mezcla temas, verifica que el motor JS esté regenerado cuando se tocó el núcleo Java,
  agrega la entrada al CHANGELOG con el autor y redacta el mensaje con prefijo, mensaje y
  descripción. Usala SIEMPRE que el usuario diga "commit", "commiteá", "/commit",
  "guardá los cambios", "subí esto", "armá el mensaje", "pushear", o cuando termines una
  tarea y haya cambios sin commitear, aunque no lo pida. También cuando pregunte cómo
  commitear o por qué el hook rechazó un commit.
---

# Commit

Objetivo doble: un historial que sirva (bisect, revert, defensa de la PPS) y que el usuario
aprenda a hacerlo solo. La primera vez en la sesión, explicá brevemente por qué partiste o
nombraste algo así; después, solo si hay algo no obvio.

Todo commit tiene tres partes y va acompañado de su entrada en el CHANGELOG:

```
prefijo(alcance): mensaje en imperativo, minúscula, sin punto, ≤72 caracteres
                                                          ← línea en blanco
Descripción: por qué se hizo, qué problema resuelve, qué alternativa se
descartó o qué queda pendiente. Prosa, líneas de hasta 72 caracteres.
```

La descripción se escribe **siempre que se pueda**. Solo se omite cuando el mensaje ya lo
dice todo (por ejemplo `build(motor): regenerar simulador.js` pegado a su cambio Java).
El hook avisa si falta.

## Flujo

1. **Estado real**, no suponer:
   ```bash
   git status --short
   git diff --stat
   git diff --staged --stat
   git config user.name
   ```
   Si `user.name` no es el nombre real de la persona (por ejemplo, un alias), avisá antes
   de seguir: es el nombre que queda en el CHANGELOG.

2. **Motor.** Si el diff toca `nucleo/pom.xml` o
   `nucleo/src/main/java/ar/edu/unlp/info/simulator/{lang,vm,js}/`:
   `node scripts/motor-hash.mjs --check`. Si falla, primero
   `cd frontend && npm run engine && npm run smoke`; `simulador.js` y `simulador.hash` van
   en el mismo commit que el Java.

3. **Cuántos commits.** Un commit = un cambio explicable sin "y". Partir si hay arreglo +
   feature, refactor + cambio de comportamiento, docs ajenas al cambio, o formateo masivo
   (va solo, tipo `style`). Proponer los grupos (por archivo o con `git add -p`) y esperar OK.

4. **CHANGELOG.** Por cada commit (salvo `style`), agregar en `CHANGELOG.md`, sección
   `## [Sin publicar]`, bajo la subsección que corresponda:

   | Prefijo | Subsección |
   |---|---|
   | `feat` | Agregado (o Cambiado si modifica algo existente) |
   | `fix` | Corregido |
   | cambio que quita algo | Eliminado |
   | `docs` | Documentación |
   | `refactor`, `perf`, `build`, `ci`, `test`, `chore` | Interno |

   Formato exacto (el hook lo verifica):
   ```
   - Descripción en infinitivo o sustantivo, terminada en punto. (Nombre Apellido, AAAA-MM-DD)
   ```
   Escrita para quien usa o mantiene el simulador, no para quien lee el diff: "Liberar el
   monitor cuando un proceso falla dentro de un procedimiento." y no "Agregar try en step".
   Si la subsección no existe todavía en `[Sin publicar]`, crearla en este orden:
   Agregado, Cambiado, Corregido, Eliminado, Documentación, Interno.

5. **Mensaje.**
   - Prefijos: `feat fix docs test refactor perf build ci chore style revert`.
   - Alcances: `lexer parser validador vm puente motor ui editor docs repo ci`.
   - Imperativo: "agregar", "corregir", "liberar".
   - `feat` solo si alumno o docente notan algo nuevo.
   - Cambio incompatible: `feat(lenguaje)!:` y en la descripción `BREAKING CHANGE: …`.
   - Si arregla algo del informe de revisión: última línea `Refs: B1`.
   - Sin atribución a IA salvo que el usuario la pida.

6. **Mostrar y confirmar.** Presentar los `git add`, la entrada del CHANGELOG y el mensaje
   completo. Ejecutar `git commit` solo con OK (usar `git commit -F archivo` o varios `-m`
   para respetar la línea en blanco). Nunca `git push` sin pedido explícito.

7. **Si el hook rechaza:** explicar la causa en una línea y corregir. `--no-verify` solo si
   el usuario lo pide explícitamente, avisando qué se saltea.

## Ejemplo completo

Diff: `VirtualMachine.java` libera el lock en el `catch`, test nuevo, motor regenerado.

CHANGELOG:
```
### Corregido
- Liberar el monitor cuando un proceso falla dentro de un procedimiento; antes la simulación se informaba como interbloqueo. (Federico Dobal, 2026-09-20)
```

Mensaje:
```
fix(vm): liberar el monitor cuando un proceso falla adentro

Un RuntimeError dentro de un procedure dejaba el lock tomado por un
proceso terminado; el resto quedaba bloqueado y la interfaz mostraba
DEADLOCK, lo que lleva al alumno a buscar un error de sincronización
que no existe.

Refs: B1
```

## Si pregunta "¿por qué tan chico?" o "¿para qué el changelog?"

`git revert` y `git bisect` trabajan por commit: si el arreglo viaja con un refactor, no se
puede deshacer uno sin el otro. El CHANGELOG es la versión legible del historial: lo que
cambió para quien usa el simulador, quién lo hizo y cuándo; sirve para la cátedra, para
el informe de la PPS y para cualquiera que se sume al proyecto.
