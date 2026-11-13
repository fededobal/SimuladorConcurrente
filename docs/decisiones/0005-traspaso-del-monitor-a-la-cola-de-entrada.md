# 0005. Traspasar el monitor al primero de la cola de entrada

- Estado: aceptada; el orden de entrada lo reemplaza 0006
- Fecha: 2026-09-23

## Contexto
Hasta esta decisión, cuando un proceso liberaba un monitor (al retornar de un procedure, al
hacer `wait`, al llamar a otro monitor o al terminar con error), la máquina virtual
despertaba a todos los procesos de la cola de entrada y los dejaba listos. Cada uno volvía
a intentar entrar recién en el siguiente instante en que el planificador le diera turno, y
solo uno lo lograba; el resto volvía a la cola.

La línea de tiempo de la interfaz hizo visible el efecto: entre el instante en que un
proceso sale del monitor y el instante en que entra el siguiente, el que esperaba aparece
un instante sin avanzar, con el monitor libre. Sobre los ocho programas de `ejemplos/`, con
25 semillas y las dos políticas de planificación, las 7407 salidas de la cola de entrada
que se registraron pasaron por ese instante intermedio (medido comparando el motor anterior
y el nuevo con el mismo programa de medición, 23/09/2026). La teoría de la cátedra
(`docs/monitores.md`, sección 1.1) describe otra cosa: el proceso queda demorado en la cola
de entrada hasta que el monitor se libere, sin un intervalo en el que el monitor esté libre
y nadie entre.

## Alternativas
1. **Despertar a toda la cola (comportamiento anterior).** No requiere cambios. Muestra un
   instante con el monitor libre y procesos esperándolo, y hace que los despertados vuelvan
   a disputarse el monitor en un orden que depende del planificador y no de la cola.
2. **Mostrar ese instante como "compitiendo" sin cambiar la máquina virtual.** Elimina el
   estado confuso en la interfaz, pero el proceso sigue entrando un instante más tarde de lo
   que describe la teoría.
3. **Traspasar el monitor al primero de la cola.** Al liberarse el monitor, el primero de
   la cola de entrada lo toma en ese mismo momento, y esa entrada cuenta como su acción del
   instante. El resto de la cola sigue esperando, en orden de llegada.

## Decisión
Se adopta la alternativa 3, porque es la que coincide con la teoría de la cátedra. Cuando
un proceso libera un monitor, primero se registra su evento de salida (`RETURN`, `WAIT` o
`RELEASE`) y después el primero de la cola de entrada toma el monitor, con su evento
`ENTER` o `REENTER`. Ese proceso figura como avanzado en el instante y no vuelve a avanzar
en el mismo instante. Si al reingresar falla la escritura de un parámetro `out` diferido
(ADR 0004), el error es de ese proceso, que termina y pasa el monitor al siguiente.

La disciplina sigue siendo *signal and continue*: `signal` mueve al despertado al final de
la cola de entrada y el proceso que señaliza conserva el monitor. El despertado entra
cuando le llega el turno en la cola, no inmediatamente después del `signal`, por lo que la
condición se sigue re-evaluando con `while`.

## Consecuencias
- Desaparece el instante intermedio: en la misma medición, ninguna de las 3458 salidas de la
  cola de entrada lo presenta, y la ejecución de los ejemplos requiere 16 719 instantes en
  lugar de 20 668.
- La cola de entrada es FIFO. Antes, el orden en que los procesos despertados volvían a
  entrar dependía del planificador.
- Cambia la traza fija de `AzarTest` y de `scripts/smoke-motor.mjs`: en el instante en que
  el proceso 4 retorna, el proceso 1 entra.
- En el modo paso a paso con un proceso elegido, el que recibe el monitor también figura
  como avanzado, aunque no sea el elegido.
- Las invariantes de `InvariantesTest` se verificaron en cada instante con 25 semillas y las
  dos políticas.
