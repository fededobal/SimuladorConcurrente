# Ejecución

## Instantes y turnos

| Concepto | Qué es |
|---|---|
| Instante | Un paso de la simulación: cada proceso que tiene turno ejecuta una sentencia |
| Sentencia | Una asignación, una llamada a un monitor, un `wait`, un `write`, un `push`; las guardas de `if`, `while` y `for` no ocupan un paso propio |
| Turno | Qué procesos avanzan en el instante: con turnos al azar, un subconjunto de los listos; en ronda, todos |
| Orden dentro del instante | Decide quién gana el monitor cuando varios lo piden a la vez |

## Estados de un proceso

| Estado | Qué significa | Cómo se ve |
|---|---|---|
| Ejecutando en el proceso | Avanzó en el último instante, fuera de los monitores | Franja lisa del color del proceso, tono claro |
| Ejecutando en el monitor | Avanzó en el último instante, con un monitor tomado | Franja lisa del color del proceso |
| Compitiendo | Espera en la cola de entrada de un monitor | Rayado ocre |
| Esperando | Dormido en una variable condición | Rayado ladrillo |
| En delay | Demorado por un `delay`; si está en un monitor, lo sigue teniendo | Punteado verde, con contador de segundos |
| Sin turno | Podía avanzar, pero no le tocó en este instante | Franja gris |

El editor, la línea de tiempo y el panel Monitores usan los mismos aspectos.

## Cómo termina

| Estado de la barra | Cuándo |
|---|---|
| **Fin** | Todos los procesos terminaron |
| **Deadlock** | Ningún proceso puede avanzar y no todos terminaron: todos están en una cola de entrada o en una variable condición. El panel Monitores muestra dónde quedó cada uno |
| **Fin con errores** / **deadlock tras un error** | Algún proceso terminó por un error de ejecución; la causa es el error, no la sincronización |
| **Error** | El programa no compiló; el mensaje y la línea aparecen debajo del editor |

::: tip
Un proceso en `delay` no cuenta como bloqueado: el simulador espera a que termine antes de
declarar un interbloqueo. Un error de ejecución termina solo el proceso que lo provocó y
libera los monitores que tuviera tomados.
:::
