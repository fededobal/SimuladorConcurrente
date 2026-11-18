---
name: semantica-concurrencia
description: >
  Semántica de ejecución del simulador de monitores (signal and continue): modelo de la
  VM (procesos, instantes, scheduler, deadlock), invariantes y programas canónicos. Usala
  cuando se modifique o revise la VirtualMachine, el scheduler, wait/signal/signal_all o
  la entrada y salida del monitor; cuando haya que explicar a un alumno
  por qué un programa se comportó así; o cuando algo "da deadlock", "no despierta" o
  "no respeta la exclusión" y no está claro si el bug es del simulador o del programa.
---

# Semántica de concurrencia

El simulador ejecuta programas con **monitores** bajo *signal and continue* y nada más
(ADR 0003). Acá está el modelo general de la VM; las reglas de los monitores, sus
invariantes y los programas canónicos están en `references/monitores.md`. La fuente de
verdad es el material de la cátedra, en `docs/clases-materia/` (Teoría 4 y Explicación 3).

## Modelo de la VM

- **Proceso**: pila de activaciones, estados `READY`, `RUNNING`, `BLOCKED(motivo, recurso)`,
  `TERMINATED`. Todo bloqueo tiene un motivo y un recurso nombrado: eso es lo que la UI
  le muestra al alumno.
- **Instante**: el scheduler arma un turno de procesos listos (política `RANDOM` o
  `ROUND_ROBIN`, `ADVANCE_PROBABILITY`); cada uno ejecuta hasta una sentencia observable. Las
  estructurales (bloques, evaluar guardas) no consumen instante. Con proceso elegido,
  avanza solo ese.
- **Deadlock**: no terminó, ningún proceso está `READY` y ninguno está en `delay`.
- **Error de ejecución**: el proceso termina con `ERROR` y línea; **libera todo recurso que
  tuviera tomado** (el lock de cada monitor en el que estaba), que pasa a uno de su cola de
  entrada, elegido al azar.

## Invariantes

1. El lock de cada monitor, si tiene dueño, lo tiene un proceso vivo.
2. Un proceso está bloqueado en a lo sumo un recurso a la vez, y figura en la cola de ese
   recurso y en ninguna otra.
3. Todo camino que saca a un proceso de una sección protegida (retorno, espera, error)
   devuelve el lock y se lo pasa a uno de la cola de entrada, al azar (ADR 0005 y 0006).
4. Misma semilla + misma política (+ mismos procesos elegidos, si los hubo) = misma
   ejecución, en la JVM y en el navegador (el azar sale de `vm/SeededRandom`, no de
   `java.util.Random`; `delay` se mide en instantes, ADR 0008). La interfaz usa una semilla
   nueva en cada ejecución, la muestra, y permite repetirla con el botón Repetir.
5. `DEADLOCK` es siempre un deadlock del programa del alumno, nunca un error interno.
6. Nada crece sin tope durante una ejecución larga (log, salida, snapshots). Los eventos no
   llevan el estado; el log guarda los últimos `MAX_ENTRIES` y la salida los últimos `MAX_LINES`.
7. La semántica implementada coincide con la de la cátedra. Si hay que apartarse (por
   ejemplo, para visualizar mejor), se documenta en un ADR.

## Verificar un cambio

- Todos los programas canónicos siguen pasando (JUnit + smoke).
- Con azar: semillas 0..24 y también `ROUND_ROBIN`.
- Las invariantes se chequean en **cada** snapshot, no solo al final.

## Explicarle un resultado a un alumno

1. Reproducir con la misma semilla.
2. Recorrer el log por instantes y señalar el evento clave.
3. Relacionarlo con la teoría (`docs/clases-materia/`; en la guía,
   `docs/ejecucion/variables-condicion.md`).
4. Si contradice la teoría, es bug del simulador: primero el test que lo muestra.
