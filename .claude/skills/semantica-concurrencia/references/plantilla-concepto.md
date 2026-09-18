# <Concepto>: modelo, invariantes y casos canónicos

Fuente de verdad: `docs/teoria/<concepto>.md` (notación de la cátedra).

## Modelo
- Primitiva(s) y su estado (contador, cola, dueño, buffer de mensajes…).
- Operaciones: qué hace cada una, si consume instante, cuándo bloquea, a quién despierta y
  en qué orden (FIFO, arbitrario, prioridad).
- Motivo de bloqueo que ve el alumno y recurso asociado.

## Invariantes propias
1. …

## Programas canónicos
Nombre, programa, resultado esperado independiente del entrelazado. Mínimo: el caso de
libro, un caso de deadlock real y un caso con el error típico de los alumnos.

## Errores típicos de los alumnos
Qué se equivocan y cómo lo muestra el simulador.
