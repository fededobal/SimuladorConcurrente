---
name: semantica-concurrencia
description: >
  Semántica de ejecución del simulador para cada concepto de concurrencia que soporta
  (hoy monitores; a futuro semáforos, locks, barreras, pasaje de mensajes, memoria
  compartida con await, y los que agregue la cátedra): modelo de la VM compartida
  (procesos, instantes, scheduler, deadlock), invariantes globales y, por concepto, sus
  reglas y programas canónicos. Usala cuando se modifique o revise la VirtualMachine, el
  scheduler o cualquier primitiva de sincronización; cuando haya que explicar a un alumno
  por qué un programa se comportó así; o cuando algo "da deadlock", "no despierta" o
  "no respeta la exclusión" y no está claro si el bug es del simulador o del programa.
---

# Semántica de concurrencia

El simulador es una **VM común** (procesos, instantes, scheduler, eventos, snapshots) sobre
la que se montan **primitivas de sincronización** de distintos conceptos. Esta skill tiene
la parte común acá y un archivo por concepto en `references/`.

| Concepto | Referencia | Teoría de la cátedra | Estado |
|---|---|---|---|
| Monitores (signal and continue) | `references/monitores.md` | `docs/monitores.md` | implementado |
| Otros (semáforos, barreras, mensajes, …) | crear con `references/plantilla-concepto.md` | `docs/teoria/…` | pendiente |

Leé solo la referencia del concepto que toca la tarea. Si el concepto no tiene referencia,
usá la skill `nuevo-concepto-concurrencia` antes de implementar nada.

## Modelo común (vale para todos los conceptos)

- **Proceso**: pila de activaciones, estados `READY`, `RUNNING`, `BLOCKED(motivo, recurso)`,
  `TERMINATED`. Todo bloqueo tiene un motivo y un recurso nombrado: eso es lo que la UI
  le muestra al alumno.
- **Instante**: el scheduler arma un turno de procesos listos (política `RANDOM` o
  `ROUND_ROBIN`, `PROB_AVANCE`); cada uno ejecuta hasta una sentencia observable. Las
  estructurales (bloques, evaluar guardas) no consumen instante. Con proceso elegido,
  avanza solo ese.
- **Deadlock**: no terminó y ningún proceso está `READY`.
- **Error de ejecución**: el proceso termina con `ERROR` y línea; **libera todo recurso que
  tuviera tomado** (lock de monitor, semáforo en uso, etc.).

## Invariantes globales

1. Todo recurso con dueño (lock de monitor, mutex) tiene como dueño un proceso vivo.
2. Un proceso está bloqueado en a lo sumo un recurso a la vez, y figura en la cola de ese
   recurso y en ninguna otra.
3. Todo camino que saca a un proceso de una sección protegida (retorno, espera, error)
   devuelve el recurso y despierta a quien corresponda según el concepto.
4. Misma semilla + misma política = misma ejecución (el docente reproduce "el caso raro").
5. `DEADLOCK` es siempre un interbloqueo del programa del alumno, nunca un error interno.
6. Nada crece sin tope durante una ejecución larga (log, salida, snapshots). Los eventos no
   llevan el estado; el log guarda los últimos `TOPE_LOG` y la salida los últimos `TOPE_SALIDA`.
7. La semántica implementada coincide con la de la cátedra. Si hay que apartarse (por
   ejemplo, para visualizar mejor), se documenta en un ADR.

## Verificar un cambio

- Todos los programas canónicos de todos los conceptos siguen pasando (JUnit + smoke).
- Con azar: semillas 0..24 y también `ROUND_ROBIN`.
- Las invariantes se chequean en **cada** snapshot, no solo al final.

## Explicarle un resultado a un alumno

1. Reproducir con la misma semilla.
2. Recorrer el log por instantes y señalar el evento clave.
3. Relacionarlo con la teoría del concepto (sección y documento).
4. Si contradice la teoría, es bug del simulador: primero el test que lo muestra.
