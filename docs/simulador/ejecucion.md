# Ejecución

## Instantes y turnos

| Concepto | Qué es |
|---|---|
| instante | un paso de la simulación: cada proceso que tiene turno ejecuta una sentencia |
| sentencia | una asignación, una llamada a un monitor, un `wait`, un `write`, un `push`; las guardas de `if`, `while` y `for` no ocupan un paso propio |
| turno | qué procesos avanzan en el instante: con turnos al azar, un subconjunto de los listos; en ronda, todos |
| orden dentro del instante | decide quién gana el monitor cuando varios lo piden a la vez |

## Estados de un proceso

| Estado | Qué significa | Cómo se ve |
|---|---|---|
| Ejecutando en el proceso | avanzó en el último instante, fuera de los monitores | franja lisa del color del proceso, tono claro |
| Ejecutando en el monitor | avanzó en el último instante, con un monitor tomado | franja lisa del color del proceso |
| Compitiendo | espera en la cola de entrada de un monitor | rayado ocre |
| Esperando | dormido en una variable condición | rayado ladrillo |
| En delay | demorado por un `delay`; si está en un monitor, lo sigue teniendo | punteado verde, con contador de segundos |
| Sin turno | podía avanzar, pero no le tocó en este instante | franja gris |

El editor, la línea de tiempo y el panel Monitores usan los mismos aspectos.

## Cómo termina

| Estado de la barra | Cuándo |
|---|---|
| **fin** | todos los procesos terminaron |
| **deadlock** | ningún proceso puede avanzar y no todos terminaron: todos están en una cola de entrada o en una variable condición. El panel Monitores muestra dónde quedó cada uno |
| **fin con errores** / **deadlock tras un error** | algún proceso terminó por un error de ejecución; la causa es el error, no la sincronización |
| **error** | el programa no compiló; el mensaje y la línea aparecen debajo del editor |

::: tip
Un proceso en `delay` no cuenta como bloqueado: el simulador espera a que termine antes de
declarar un interbloqueo. Un error de ejecución termina solo el proceso que lo provocó y
libera los monitores que tuviera tomados.
:::
