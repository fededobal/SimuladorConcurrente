# 0006. Elegir al azar quién entra al monitor cuando se libera

- Estado: aceptada
- Fecha: 2026-11-13
- Reemplaza en parte a: 0005 (el orden de la cola de entrada)

## Contexto
El ADR 0005 resolvió dos cosas a la vez: que el monitor no quede un instante libre con
procesos esperándolo, y que al liberarse entre el primero de la cola de entrada. La segunda
parte se justificó con la teoría (`docs/monitores/index.md`, Exclusión mutua implícita), que no habla del orden.

La explicación práctica de monitores de la cátedra (Explicación 3, diapositiva 2) sí lo
trata, y dice lo contrario: "Cuando el monitor está libre TODOS los procesos que están
haciendo llamados a sus procedimientos compiten por acceder al monitor, NO acceden de
acuerdo al orden de llegada". El ejercicio 2 de la misma explicación se apoya en esa
regla: el proceso despertado con `signal` compite con los que llegan después, y uno de
ellos puede entrar antes y encontrar el cajero libre.

Con la cola FIFO, el simulador mostraba un orden que la cátedra niega, y el alumno podía
concluir que sus procesos entran en el orden en que llamaron.

## Alternativas
1. **Mantener la cola FIFO.** No cambia nada, pero contradice la explicación práctica.
2. **Volver a despertar a toda la cola (anterior al ADR 0005).** Respeta la competencia,
   pero vuelve a mostrar el instante con el monitor libre y procesos esperándolo.
3. **Traspasar el monitor a un proceso de la cola elegido al azar.** Conserva la entrada en
   el mismo instante del ADR 0005 y quita el orden de llegada.

## Decisión
Se adopta la alternativa 3. Cuando un proceso libera un monitor, entra en ese mismo
instante uno de los procesos de la cola de entrada, elegido al azar con el generador de la
máquina virtual (`vm/SeededRandom`). Si la cola tiene un solo proceso no se sortea, para no
consumir azar. El sorteo se hace con las dos políticas de planificación, porque la política
decide qué procesos avanzan en cada instante y no quién gana el monitor.

La cola de entrada se sigue guardando en orden de llegada solo para mostrarla en la
interfaz. *Signal and continue* no cambia: el despertado pasa a la cola de entrada y
compite allí con los demás.

## Consecuencias
- El caso del ejercicio 2 (un proceso que llega después entra antes que el despertado)
  aparece en el simulador; `VirtualMachineTest.laEntradaAlMonitorNoRespetaElOrdenDeLlegada`
  lo verifica con 25 semillas.
- Cambia la traza fija de `AzarTest` y de `scripts/smoke-motor.mjs`: en el instante en que
  el proceso 4 retorna, entra el proceso 3 en lugar del 1.
- Con turnos en ronda y semillas chicas consecutivas el primer sorteo da siempre el mismo
  resultado, porque el generador es el de `java.util.Random`. La interfaz usa el reloj como
  semilla, así que no se nota en el uso; los tests usan semillas espaciadas.
- La invariante 3 de la máquina virtual pasa a decir "a uno de la cola de entrada" en lugar
  de "al primero".
