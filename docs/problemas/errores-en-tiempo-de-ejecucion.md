# Errores en tiempo de ejecución

Un error en tiempo de ejecución ocurre con el programa ya compilado. Termina solo al proceso
que lo provocó, que queda marcado en rojo en el editor con su línea y el mensaje; los demás
procesos siguen. Si el proceso estaba dentro de monitores, los libera.

La barra indica **fin con errores** o **deadlock tras un error**
([Finalización](/ejecucion/finalizacion)). En el segundo caso, el interbloqueo suele ser
consecuencia del error: un proceso esperaba un `signal` que el proceso terminado no llegó a
ejecutar.

| Mensaje | Causa | Corrección |
|---|---|---|
| `pop sobre la cola vacía 'c'` | Se desencoló sin comprobar que hubiera elementos; con *signal and continue*, otro proceso pudo vaciar la cola antes | Esperar con `while (empty(c)) wait(cv);` o llevar la cuenta en una variable |
| `Índice 2 fuera de rango para 'a' (tamaño 2)` | Los índices van de 0 al tamaño menos 1 | Revisar los límites de los ciclos y de las familias |
| `Índice 3 fuera de rango para el monitor 'E' (va de 0 a 2)` | Llamada a un monitor inexistente del arreglo | Revisar el índice |
| `Índice 5 fuera de rango para la cond 'c' (tamaño 2)` | Arreglo de condiciones más chico que la familia de procesos | Ajustar el tamaño del arreglo de `cond` |
| `División por cero` / `Módulo por cero` | El divisor vale 0 | Comprobarlo antes de dividir |
| `Desborde de entero: el resultado no entra en un int` | El resultado supera el máximo de `int` | Revisar la cuenta |
| `Resultado no representable: la cuenta con double se desborda o no está definida` | Un `double` infinito o indefinido | Revisar la cuenta |
| `Tamaño de arreglo inválido: -1 (tiene que estar entre 0 y 100000)` | Tamaño negativo o demasiado grande | Ajustar el tamaño ([Límites](/referencia/limites)) |
| `El delay tiene que ser de 0 a 3600 segundos y es de 4000` | Demora fuera de rango | Usar un valor de 0 a 3600 |
| `P ya está dentro de A y no puede volver a llamarlo desde otro monitor` | Un procedure de A llama a B, y B llama de nuevo a A | Reorganizar las llamadas entre monitores |

## Errores al iniciar

Estos errores se informan debajo del editor, como los de compilación, porque ocurren antes
del primer instante:

| Mensaje | Causa |
|---|---|
| `Error al inicializar: La inicialización del monitor M no terminó después de 100000 pasos: revisá si tiene un ciclo infinito` | Un ciclo sin fin en las sentencias sueltas del monitor |
| `Error al inicializar: Demasiados procesos: el simulador admite hasta 5000 en total` | Familias de procesos demasiado grandes |
| `Error al inicializar: Demasiados monitores en M: el simulador admite hasta 1000 por arreglo` | Arreglo de monitores demasiado grande |
