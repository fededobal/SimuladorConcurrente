# La barra de controles

| Control | Qué hace |
|---|---|
| **Ejecutar** / **Pausar** | la simulación avanza sola, un instante por vez, hasta pausarla o hasta que termina o se traba |
| **Paso** | avanza un solo instante |
| **Detener** | vuelve al principio del programa y vacía la línea de tiempo y la salida |
| **Velocidad** | cuánto dura cada instante en pantalla (tabla siguiente) |
| **Turnos** | la política de planificación (tabla siguiente); se puede cambiar durante la ejecución |
| **Ejemplos** | carga un [programa de ejemplo](/ejemplos); pide confirmación si el editor tiene un programa propio |
| **Salida** | abre la [pantalla de salida](./salida); el número es la cantidad de líneas |
| **Documentación** | abre este sitio |
| Estado e instante | listo, ejecutando, en pausa, fin, deadlock o error, y el número del instante actual |

## Velocidades

| Opción | Duración de un instante |
|---|---|
| lento | 1,2 s |
| normal | 0,6 s |
| rápido | 0,3 s |
| muy rápido | 0,12 s |

## Turnos

| Política | Quién avanza en cada instante | Para qué sirve |
|---|---|---|
| **al azar** | cada proceso listo entra al turno con una probabilidad del 80 %; al menos uno avanza | ver que el resultado depende del entrelazado: dos corridas pueden diferir |
| **en ronda** | todos los procesos listos, por turno | seguir el programa con calma y de forma repetible |

::: tip
En las dos políticas, el orden dentro del instante decide quién gana el monitor cuando
varios lo piden a la vez. Mientras la simulación está detenida se puede editar el programa.
:::
