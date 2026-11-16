# Resultados que varían

Varios comportamientos del simulador cambian entre ejecuciones o parecen contradecir el
orden del código. Son correctos y corresponden al modelo de la cátedra.

## El resultado cambia en cada ejecución

Con turnos **Al azar**, en cada instante avanza un subconjunto distinto de procesos, y cada
ejecución usa una semilla distinta. El orden de la salida, el orden de entrada a los
monitores y el instante en que termina cada proceso pueden cambiar. Lo que garantiza la
sincronización no cambia ([Comparación de ejecuciones](/operacion/comparar-ejecuciones)).

## El proceso despertado no entra primero

Con *signal and continue*, el proceso despertado pasa a la cola de entrada y compite con
los demás. Al liberarse el monitor entra uno elegido al azar, sin respetar el orden de
llegada. Un proceso que llamó después puede entrar antes que el despertado y cambiar el
estado ([Variables condición](/ejecucion/variables-condicion)).

Si el programa necesita que el despertado encuentre el estado intacto, se usa la técnica de
pasaje de la condición; si alcanza con que vuelva a comprobarlo, se espera con `while`.

## Un proceso pasa a otro que llegó antes

La cola de entrada no respeta el orden de llegada. Para atender en orden se guardan los
identificadores en una `Cola` y se despierta a cada proceso con una variable condición
privada ([Acceso al monitor](/ejecucion/acceso-al-monitor)).

## Un `if` funciona a veces

Un `wait` dentro de un `if` puede dar el resultado correcto en muchas ejecuciones y fallar
en otras, cuando otro proceso se adelanta al despertado. Ejecutar el programa varias veces
con turnos **Al azar** permite detectarlo; la corrección habitual es reemplazar el `if` por
un `while`.

## Con turnos en ronda también hay diferencias

En ronda, el orden de avance de los procesos es fijo, pero quién entra a un monitor que se
libera con varios procesos esperando se sigue sorteando. Un programa con `delay` tampoco se
repite, porque depende del tiempo real.
