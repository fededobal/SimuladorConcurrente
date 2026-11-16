# Comparación de ejecuciones

## Objetivo

Comprobar qué partes del resultado de un programa dependen del entrelazado de los procesos
y cuáles garantiza la sincronización.

## Procedimiento

1. Cargar el ejemplo **Exclusión mutua implícita**. Cuatro procesos llaman a
   `Cuenta.sumar()`, que incrementa `x` y registra en `maxDentro` cuántos procesos llegaron
   a estar dentro del monitor a la vez.
2. Elegir **Al azar** en **Turnos** y presionar **Ejecutar**.
3. Al terminar, anotar los valores de `x` y `maxDentro` en el panel de monitores, y el orden
   en que cada proceso tuvo el monitor según el carril de la línea de tiempo.
4. Presionar **Ejecutar** otra vez. El programa se ejecuta desde el principio con otra
   semilla.
5. Repetir los pasos 3 y 4 varias veces y comparar.
6. Para un programa con `write`, comparar además el orden de las líneas en **Salida**.

## Resultado esperado

El orden en que los procesos tienen el monitor cambia entre ejecuciones; los valores
finales no: `x` vale 4 y `maxDentro` vale 1 en todas. El carril del monitor nunca muestra
dos nombres en el mismo instante.

## Interpretación

| Lo que cambia entre ejecuciones | Lo que no cambia |
|---|---|
| El orden de entrada al monitor | Que haya un solo proceso dentro a la vez |
| El orden de las líneas de la salida | Lo que garantiza la sincronización del programa |
| En qué instante termina cada proceso | El resultado de un programa correcto |

Si un valor que debería ser fijo cambia entre ejecuciones, el programa tiene un error de
sincronización: alguna condición se verifica con `if` donde hace falta `while`, o se
modifica estado compartido fuera del monitor. Con turnos **En ronda** el orden de avance es
fijo, lo que facilita reproducir un caso, aunque la entrada a un monitor con varios
procesos esperando se sigue sorteando ([Instantes y turnos](/ejecucion/instantes-y-turnos)).
