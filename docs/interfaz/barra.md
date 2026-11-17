# Barra de controles

La barra superior reúne el programa abierto, los controles de la ejecución y el estado de la
simulación.

<figure>

![Barra de controles: marca, menú del programa Productor/Consumidor, grupo con Ejecutar, Paso, Detener y Repetir, menús Normal y Al azar, estado "En pausa" con el instante 14, enlace para compartir, Guía y cambio de tema](/capturas/barra.png)

<figcaption>Barra de controles con la simulación en pausa en el instante 14.</figcaption>
</figure>

| Control | Qué hace |
|---|---|
| Menú del programa | Muestra el nombre del programa abierto. Permite renombrarlo, empezar uno nuevo, abrir o descargar un archivo, guardarlo y abrir un ejemplo ([Programas y archivos](./programas)) |
| **Ejecutar** / **Pausar** (F5) | La simulación avanza sola, un instante por vez, hasta pausarla o hasta que termina o se traba |
| **Paso** (F10) | Avanza un solo instante |
| Flecha junto a **Paso** | Lista los procesos; al elegir uno, en ese instante avanza solo ese proceso ([Ejecución paso a paso](/operacion/paso-a-paso)) |
| Detener (Shift + F5) | Vuelve al principio del programa y vacía la línea de tiempo y la salida |
| Repetir | Vuelve al instante 0 con la misma semilla: la ejecución se repite igual |
| Velocidad | Cuánto dura cada instante en pantalla (tabla siguiente) |
| Turnos | La política de planificación (tabla siguiente); se puede cambiar durante la ejecución |
| Estado e instante | El estado de la simulación ([Finalización](/ejecucion/finalizacion)) y el número del instante actual |
| Enlace | Copia una dirección que abre este programa en otro navegador ([Programas y archivos](./programas)) |
| **Guía** | Abre esta guía |
| Luna / sol | Pasa al tema oscuro o al claro. La primera vez se usa el del sistema operativo; después, el navegador recuerda el elegido. La guía usa el mismo tema y tiene su propio botón |

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

## Semilla y repetición

Cada ejecución usa una semilla de cinco cifras, que la barra de estado muestra al pie de la
pantalla. La semilla fija todas las decisiones al azar: qué procesos avanzan en cada instante
y quién entra a un monitor que se libera. Con la misma semilla y la misma política de
turnos, la ejecución es idéntica.

| Acción | Semilla |
|---|---|
| **Ejecutar** o **Paso** después de detener, de terminar o de editar el programa | Una nueva |
| Repetir | La misma |
| Abrir un enlace compartido después de una ejecución | La de esa ejecución |

::: tip Nota
El programa se puede editar en pausa o con la simulación detenida. Modificarlo descarta la
ejecución en curso: la próxima vez que se presione **Paso** o **Ejecutar**, se compila de
nuevo y empieza desde el principio.
:::
