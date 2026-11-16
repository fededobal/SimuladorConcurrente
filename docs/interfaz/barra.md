# Barra de controles

La barra superior reúne los controles de la ejecución y el estado de la simulación.

| Control | Qué hace |
|---|---|
| **Ejecutar** / **Pausar** | La simulación avanza sola, un instante por vez, hasta pausarla o hasta que termina o se traba |
| **Paso** | Avanza un solo instante |
| **Detener** | Vuelve al principio del programa y vacía la línea de tiempo y la salida |
| **Velocidad** | Cuánto dura cada instante en pantalla (tabla siguiente) |
| **Turnos** | La política de planificación (tabla siguiente); se puede cambiar durante la ejecución |
| **Ejemplos** | Carga un [programa de ejemplo](/referencia/ejemplos); pide confirmación si el editor tiene un programa propio |
| **Salida** | Abre la [pantalla de salida](./salida); el número es la cantidad de líneas |
| **Documentación** | Abre este sitio |
| Luna / sol | Pasa al tema oscuro o al claro. La primera vez se usa el del sistema operativo; después, el navegador recuerda el elegido. La documentación usa el mismo tema y tiene su propio botón |
| Estado e instante | El estado de la simulación ([Finalización](/ejecucion/finalizacion)) y el número del instante actual |

## Velocidades

| Opción | Duración de un instante |
|---|---|
| Lento | 1,2 s |
| Normal | 0,6 s |
| Rápido | 0,3 s |
| Muy rápido | 0,12 s |

## Turnos

| Política | Quién avanza en cada instante |
|---|---|
| Al azar | Cada proceso que puede avanzar, con una probabilidad del 80 %; al menos uno avanza |
| En ronda | Todos los procesos que pueden avanzar, por turno |

El detalle de cada política está en [Instantes y turnos](/ejecucion/instantes-y-turnos).

::: tip
El programa se puede editar en pausa o con la simulación detenida. Modificarlo descarta la
ejecución en curso: la próxima vez que se presione **Paso** o **Ejecutar**, se compila de
nuevo y empieza desde el principio.
:::
