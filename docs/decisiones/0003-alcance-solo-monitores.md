# 0003. Limitar el alcance del simulador a monitores

- Estado: aceptada
- Fecha: 2026-09-18
- Reemplaza a: 0002

## Contexto
El ADR 0002 proponía reorganizar el núcleo para incorporar otros temas de la materia
(semáforos, barreras, sentencias `await`, pasaje de mensajes) sobre una máquina virtual
común. Esa reorganización tiene un costo inicial: extraer la lógica de monitores de
`VirtualMachine` a un paquete propio, definir modelos explícitos por programa y una vista
genérica de recursos en el snapshot.

El proyecto de PPS se acotó a monitores con disciplina *signal and continue*. El trabajo
pendiente de mayor valor para el alumno está en la visualización de ese único concepto: hoy
la interfaz muestra el editor con la línea de cada proceso y la pantalla de salida, pero no
el estado interno del monitor que la máquina virtual ya calcula en cada snapshot (variables
permanentes y locales, colas de las variables condición, cola de entrada, contenido de las
colas `Cola` y `ColaOrdenada`).

## Alternativas
1. **Mantener la preparación para varios conceptos (ADR 0002).** Deja el núcleo listo para
   crecer, pero invierte tiempo en una generalización que el alcance actual no usa.
2. **Limitar el alcance a monitores.** El núcleo conserva su forma actual y el esfuerzo se
   dirige a la visualización. Si en el futuro se incorporara otro concepto, habría que
   retomar la reorganización.

## Decisión
Se adopta la alternativa 2. El simulador cubre únicamente monitores. No se extraen
paquetes por concepto ni se agregan modelos de programa; el ADR 0002 queda reemplazado.

Las funcionalidades previstas, en orden tentativo, son:
1. Visor de variables permanentes de cada monitor y locales de cada proceso.
2. Visor de variables condición con sus colas y de la cola de entrada del monitor.
3. Visualización de estructuras de datos (`Cola`, `ColaOrdenada`, arreglos).
4. Historial de eventos en forma de línea de tiempo, de solo lectura. No se implementa
   *time-travel* (volver a un instante anterior y continuar desde ahí).

## Consecuencias
- Se eliminan la skill `nuevo-concepto-concurrencia` y la plantilla de referencia por
  concepto; `CLAUDE.md`, `CONTRIBUTING.md` y las skills restantes describen un simulador de
  monitores.
- `VirtualMachine` sigue teniendo alrededor de 800 líneas. Conviene partirla cuando alguna
  de las funcionalidades anteriores la haga crecer, en un commit `refactor(vm)` separado y
  con los casos canónicos en verde.
- El historial en línea de tiempo se apoya en el registro de eventos acotado a los últimos
  2000 (corrección del bug B6). Si hiciera falta mostrar el estado de un instante pasado,
  se reconstruye volviendo a simular desde la semilla, no guardando un snapshot por evento.
