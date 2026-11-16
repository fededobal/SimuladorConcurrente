# Finalización

La barra de controles indica cómo terminó la ejecución.

| Estado de la barra | Cuándo |
|---|---|
| fin | Todos los procesos terminaron |
| deadlock | Ningún proceso puede avanzar y no todos terminaron: cada uno está en una cola de entrada o en una variable condición |
| fin con errores | Todos terminaron, pero alguno por un error de ejecución |
| deadlock tras un error | Ningún proceso puede avanzar después de que alguno terminó por un error; la causa es el error, no la sincronización |
| error | El programa no compiló; el mensaje y la línea aparecen debajo del editor |
| esperando que termine un delay | Ningún proceso puede avanzar, pero alguno está en `delay`; la ejecución continúa cuando termina |

## Interbloqueo

El interbloqueo (*deadlock*) se detecta en el instante en que ocurre. La tarjeta de ese
instante, en la [línea de tiempo](/interfaz/linea-de-tiempo), lo describe con un mensaje
como este:

```
Interbloqueo: ningún proceso puede avanzar. P espera en B.c y retiene A
```

El panel de monitores muestra dónde quedó cada proceso. El procedimiento para encontrar la
causa está en [Diagnóstico de un interbloqueo](/operacion/interbloqueo).

Un proceso en `delay` no se considera bloqueado: el simulador espera a que termine antes de
decidir si hay interbloqueo.

## Errores de ejecución

Un error de ejecución termina solo al proceso que lo provocó y libera los monitores que
tenía tomados; los demás procesos siguen. El proceso queda marcado en rojo en el editor, con
su mensaje ([Errores en tiempo de ejecución](/problemas/errores-en-tiempo-de-ejecucion)).
