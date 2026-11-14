# Ejecución

## Instantes y turnos

La simulación avanza por instantes. En cada instante, cada proceso que tiene turno ejecuta
una sentencia: una asignación, una llamada a un monitor, un `wait`, un `write`. Los procesos
corren en paralelo, no entrelazados de a uno. Con turnos al azar no todos avanzan en cada
instante; con turnos en ronda avanzan todos los listos. En los dos casos, el orden dentro
del instante decide quién gana el monitor cuando varios lo piden a la vez.

## Estados de un proceso

| Estado | Qué significa | Cómo se ve |
|---|---|---|
| Ejecutando en el proceso | avanzó en el último instante, fuera de los monitores | franja lisa del color del proceso, tono claro |
| Ejecutando en el monitor | avanzó en el último instante, con un monitor tomado | franja lisa del color del proceso |
| Compitiendo | espera en la cola de entrada de un monitor | rayado ocre, borde punteado |
| Esperando | dormido en una variable condición | rayado ladrillo, borde punteado |
| En delay | demorado por un `delay`; si está en un monitor, lo sigue teniendo | punteado verde y un contador con los segundos que faltan |
| Sin turno | podía avanzar, pero no le tocó en este instante | franja gris |

El editor, la línea de tiempo y el panel Monitores usan los mismos aspectos, así un proceso
se reconoce igual en los tres.

## Fin

La simulación termina cuando todos los procesos terminaron. El estado de la barra pasa a
"fin".

## Interbloqueo

Si ningún proceso puede avanzar y no todos terminaron, porque todos están en una cola de
entrada o en una variable condición, el estado pasa a **deadlock** y el panel Monitores
muestra dónde quedó cada uno. Si algún proceso está en `delay`, el simulador espera a que
termine antes de declarar un interbloqueo.

## Errores

Un error de compilación impide arrancar: aparece debajo del editor con su línea. Un error
de ejecución, como un índice fuera de rango o un `pop` sobre una cola vacía, termina solo
el proceso que lo provocó y libera los monitores que tuviera tomados; los demás siguen.
Después de un error, el estado dice "fin con errores" o "deadlock tras un error", para
distinguir un problema del programa de un problema de sincronización. La lista de mensajes
está en [Qué avisa el compilador](/lenguaje/errores).
