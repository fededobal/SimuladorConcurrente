# Procesos y salida

Además de **Monitores**, el inspector tiene las pestañas **Procesos** y **Salida**. Cada
pestaña indica cuántos elementos tiene.

## Procesos

<figure>

![Pestaña Procesos con los clientes del ejemplo del banco: cada fila tiene el nombre en su color, lo que está haciendo, la línea, el botón Avanzar y, debajo, las variables locales](/capturas/procesos.png)

<figcaption>Procesos del ejemplo Problema completo: banco y escritorios en el instante 14.</figcaption>
</figure>

| Elemento | Qué muestra |
|---|---|
| Nombre | El proceso, con su color |
| Barra del color del proceso, a la izquierda de la fila | El proceso avanzó en el último instante |
| Estado | Lo que está haciendo: ejecutando su código, dentro de un monitor, compitiendo por uno, dormido en un `wait`, en `delay` con los instantes que faltan, sin turno o terminado |
| Línea | La línea del programa en la que está |
| **Avanzar** | Da un paso en el que solo avanza ese proceso. Está deshabilitado si el proceso no puede avanzar o si la simulación está corriendo |
| Variables locales | Las del proceso y las del procedure que está ejecutando, con su valor; la que cambia se destaca un momento |

Con más de sesenta procesos, la lista se muestra por partes. Un proceso con más de ocho
variables locales muestra las primeras ocho y un botón despliega las demás.

## Salida

La pestaña **Salida** muestra lo que escriben los procesos con
[`write`](/lenguaje/instrucciones/write).

<figure>

![Pestaña Salida con cinco líneas: a la izquierda el instante, luego el nombre del proceso en su color, de Persona[0] a Persona[4], y el texto "usé el cajero"](/capturas/salida.png)

<figcaption>Salida del ejemplo Exclusión mutua implícita al terminar.</figcaption>
</figure>

| Qué | Cómo |
|---|---|
| Cada `write` | Una línea, con el instante y el nombre del proceso en su color |
| Capacidad | Las últimas 500 líneas |

::: tip Nota
Con turnos al azar, el orden de la salida cambia entre ejecuciones: es la forma más directa
de observar el entrelazado ([Comparación de ejecuciones](/operacion/comparar-ejecuciones)).
:::
