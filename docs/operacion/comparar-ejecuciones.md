# Comparación de ejecuciones

## Objetivo

Comprobar qué partes del resultado de un programa dependen del entrelazado de los procesos
y cuáles garantiza la sincronización.

## Procedimiento

1. Cargar el ejemplo **Exclusión mutua implícita**. Cinco procesos llaman a
   `Cajero.PasarAlCajero()`, que demora dos instantes dentro del monitor e incrementa
   `usos`.
2. Elegir **Al azar** en **Turnos** y presionar **Ejecutar**.
3. Al terminar, anotar el valor de `usos` en la pestaña **Monitores**, y el orden en que
   cada proceso tuvo el monitor según el carril de la línea de tiempo.
4. Presionar **Ejecutar** otra vez. El programa se ejecuta desde el principio con otra
   semilla, que la barra de estado muestra. Para revisar de nuevo la ejecución anterior,
   **Repetir** usa la misma semilla.
5. Repetir los pasos 3 y 4 varias veces y comparar.
6. Para un programa con `write`, comparar además el orden de las líneas en la pestaña **Salida**.

## Resultado esperado

El orden en que los procesos tienen el monitor cambia entre ejecuciones; el valor final
no: `usos` vale 5 en todas. El carril del monitor nunca muestra dos nombres en el mismo
instante.

## Comparar una espera con `if` y con `while`

1. Cargar el ejemplo **Espera con if: un semáforo que falla** y ejecutarlo varias veces con
   turnos **Al azar**.
2. En cada ejecución, observar la variable `s` en la pestaña **Monitores** y el orden de las
   líneas de la pestaña **Salida**. En algo más de la mitad de las ejecuciones, `s` llega a
   -1 y dos trabajadores escriben que entraron a la sección crítica sin que ninguno haya
   salido.
3. Con **Repetir**, volver a ver una ejecución que falló y ubicar en la línea de tiempo el
   instante en que un proceso entra al monitor antes que el despertado.
4. Cargar el ejemplo **Simulación de semáforos**, que es el mismo programa con `while`, y
   repetir el paso 1: `s` nunca baja de 0.

## Interpretación

| Lo que cambia entre ejecuciones | Lo que no cambia |
|---|---|
| El orden de entrada al monitor | Que haya un solo proceso dentro a la vez |
| El orden de las líneas de la salida | Lo que garantiza la sincronización del programa |
| En qué instante termina cada proceso | El resultado de un programa correcto |

Si un valor que debería ser fijo cambia entre ejecuciones, el programa tiene un error de
sincronización. La causa más frecuente es una espera escrita con `if` en un monitor donde
otro proceso puede adelantarse al despertado. Con turnos **En ronda** el orden de avance es
fijo, lo que facilita reproducir un caso, aunque la entrada a un monitor con varios
procesos esperando se sigue sorteando ([Instantes y turnos](/ejecucion/instantes-y-turnos)).
