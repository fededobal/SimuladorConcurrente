# La barra de controles

| Control | Qué hace |
|---|---|
| **Ejecutar** / **Pausar** | La simulación avanza sola, un instante por vez, hasta pausarla o hasta que termina o se traba |
| **Paso** | Avanza un solo instante |
| **Detener** | Vuelve al principio del programa y vacía la línea de tiempo y la salida |
| **Velocidad** | Cuánto dura cada instante en pantalla (tabla siguiente) |
| **Turnos** | La política de planificación (tabla siguiente); se puede cambiar durante la ejecución |
| **Ejemplos** | Carga un [programa de ejemplo](/ejemplos); pide confirmación si el editor tiene un programa propio |
| **Salida** | Abre la [pantalla de salida](./salida); el número es la cantidad de líneas |
| **Documentación** | Abre este sitio |
| Luna / sol | Pasa al tema oscuro o al claro. La primera vez se usa el del sistema operativo; después, el navegador recuerda el elegido |
| Estado e instante | Listo, ejecutando, en pausa, fin, deadlock o error, y el número del instante actual |

## Velocidades

| Opción | Duración de un instante |
|---|---|
| Lento | 1,2 s |
| Normal | 0,6 s |
| Rápido | 0,3 s |
| Muy rápido | 0,12 s |

## Turnos

| Política | Quién avanza en cada instante | Para qué sirve |
|---|---|---|
| **Al azar** | Cada proceso listo entra al turno con una probabilidad del 80 %; al menos uno avanza | Ver que el resultado depende del entrelazado: dos corridas pueden diferir |
| **En ronda** | Todos los procesos listos, por turno | Seguir el programa con calma y de forma repetible |

::: tip
En las dos políticas, el orden dentro del instante decide quién gana el monitor cuando
varios lo piden a la vez. Mientras la simulación está detenida se puede editar el programa.
:::
