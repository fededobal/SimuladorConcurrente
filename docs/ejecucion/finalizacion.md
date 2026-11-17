# Finalización

La barra de controles indica cómo terminó la ejecución.

| Estado de la barra | Cuándo |
|---|---|
| Terminó | Todos los procesos terminaron |
| Interbloqueo | Ningún proceso puede avanzar y no todos terminaron: cada uno está en una cola de entrada o en una variable condición |
| Fin con errores | Todos terminaron, pero alguno por un error de ejecución |
| Interbloqueo tras un error | Ningún proceso puede avanzar después de que alguno terminó por un error; la causa es el error, no la sincronización |
| Error | El programa no compiló; el mensaje y la línea aparecen debajo del editor |
| Esperando un delay | Ningún proceso puede avanzar, pero alguno está en `delay`; los instantes pasan hasta que termina |

## Interbloqueo

El interbloqueo (*deadlock*) se detecta en el instante en que ocurre. Un cartel sobre el
editor dice en qué instante fue, dónde espera cada proceso y por qué nadie puede
despertarlo, con el detalle que informa el motor:

```
P espera en B.c y retiene A
```

La pestaña **Monitores** suma la tabla **Por qué nadie avanza** y la línea de tiempo marca
el instante con una raya roja. El procedimiento para encontrar la causa está en
[Diagnóstico de un interbloqueo](/operacion/interbloqueo).

Un proceso en `delay` no se considera bloqueado: los instantes siguen pasando hasta que
termina su demora, y recién entonces puede haber interbloqueo.

## Errores de ejecución

Un error de ejecución termina solo al proceso que lo provocó y libera los monitores que
tenía tomados; los demás procesos siguen. El proceso queda marcado en rojo en el editor, con
su mensaje ([Errores en tiempo de ejecución](/problemas/errores-en-tiempo-de-ejecucion)).
