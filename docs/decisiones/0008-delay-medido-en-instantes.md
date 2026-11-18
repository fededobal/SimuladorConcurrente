# 0008. Medir `delay` en instantes y no en segundos

- Estado: aceptada
- Fecha: 2026-11-17

## Contexto
`delay(n)` demoraba al proceso `n` segundos de tiempo real. El núcleo no lee el reloj, así
que la interfaz le informaba la hora en cada paso (`step(política, proceso, ahora)`) y, si
ningún proceso podía avanzar pero alguno estaba demorado, el paso no hacía nada: el instante
no avanzaba hasta que vencía la demora.

Esa decisión traía tres problemas:

- Era la única parte de la simulación que dependía del tiempo real. Un programa con `delay`
  no se repetía igual con la misma semilla, y la interfaz ahora ofrece repetir una ejecución
  y compartirla con su semilla.
- En la línea de tiempo la demora no ocupaba lugar: mientras todos esperaban no se agregaban
  columnas, de modo que un `delay(90)` y un `delay(1)` se veían igual.
- Ejecutar paso a paso no servía para avanzar una demora: había que esperar los segundos
  reales, y con una velocidad lenta la duración aparente del `delay` cambiaba respecto del
  resto del programa.

En los ejercicios de la materia `delay` representa el tiempo que lleva una tarea (usar un
recurso, jugar un partido) y su unidad no tiene significado propio: importa que el proceso
quede fuera de juego mientras los demás siguen.

## Alternativas
1. **Mantener los segundos reales.** No cambia nada, pero conserva los tres problemas.
2. **Segundos simulados, con un reloj que avanza una cantidad fija por instante.** Recupera
   el determinismo, pero agrega una segunda unidad de tiempo y una constante arbitraria
   (cuántos milisegundos dura un instante) que el alumno tendría que conocer.
3. **Medir la demora en instantes.** La unidad pasa a ser la misma que usa todo el
   simulador: la que muestra la barra, la regla de la línea de tiempo y cada paso.

## Decisión
Se adopta la alternativa 3. `delay(n)` ocupa el instante en que se ejecuta y, a
continuación, el proceso no avanza durante los `n` instantes siguientes; vuelve a estar
listo en el instante `n + 1` contado desde el `delay`. `delay(0)` equivale a un `skip`. El
valor sigue siendo un `int` de 0 a 3600.

Si ningún proceso está listo pero alguno está demorado, el instante pasa igual, sin eventos.
El deadlock se sigue informando solo cuando no hay procesos listos ni demorados. Un
proceso demorado dentro de un procedure conserva el monitor, como antes.

El núcleo deja de recibir la hora: `step` vuelve a tener dos parámetros y el reloj de la
máquina virtual cuenta solo instantes. En el estado de cada proceso, `delayEndsAt` (hora de
fin) se reemplaza por `delayRemaining` (instantes que le quedan demorado).

## Consecuencias
- Misma semilla y misma política de turnos dan la misma ejecución también en los programas
  con `delay`. Lo verifica `VirtualMachineTest.delayIsDeterministic`.
- La demora se ve en la línea de tiempo con su duración: `n + 1` columnas "en delay", la
  del instante en que se ejecutó y las `n` que pasa demorado.
- Un programa que usaba `delay(5)` como "cinco segundos" ahora espera cinco instantes: con
  la velocidad "normal" (0,6 s por instante) dura unos tres segundos. Los valores grandes
  pensados como segundos alargan la ejecución en la misma proporción que cualquier otra
  sentencia.
- Cambian el contrato del puente (`SimulatorJs.step`, `simulador.d.ts`, `api.ts`), el campo
  del estado (`Snapshot.ProcessView`, `Json.java`, `types.ts`) y los mensajes: "se demora 3
  instantes", "El delay tiene que ser de 0 a 3600 instantes".
- Se regeneraron las referencias de `CharacterizationTest`. Como cambió el nombre de un campo
  del estado, cambia la huella de todas las respuestas; los eventos solo difieren en los tres
  programas que usan `delay`.
- La interfaz ya no necesita un reloj propio para el contador de la demora: muestra los
  instantes que faltan, que llegan en el estado.
