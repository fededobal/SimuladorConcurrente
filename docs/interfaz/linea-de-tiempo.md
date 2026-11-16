# Línea de tiempo

La línea de tiempo tiene una fila por proceso, una columna por instante y, arriba, un carril
por monitor.

<figure>

![Línea de tiempo del ejemplo Corralón: carril del monitor con Cliente[1], Cliente[6], Cliente[9] y Cliente[4] en sucesión; filas de procesos con tramos de espera y de ejecución; tarjeta fija del instante 10 que dice "Cliente[9] push(cAtenciones, 9)"](/capturas/linea-de-tiempo.png)

<figcaption>Ejemplo Corralón con turnos en ronda. El carril muestra que el monitor pasa de un cliente a otro sin superposiciones; la tarjeta fija describe el instante 10.</figcaption>
</figure>

| Parte | Qué muestra |
|---|---|
| Carril del monitor (fondo gris) | Quién tuvo el monitor en cada instante, con su nombre sobre su color; "libre" en los huecos. Nunca hay dos nombres a la vez: esa es la exclusión mutua |
| Fila de un proceso | Su estado en cada instante, con el mismo aspecto que la franja del editor. Las filas no se mueven: quedan en el orden de declaración, con una línea entre familias |
| Rótulo de un tramo | La causa de la espera (`espera entrar a Corralon`, `wait(esperaCli[3])`) o el nombre del monitor en el que ejecuta; si no entra, se recorta con puntos suspensivos |
| Leyenda | Los seis [estados](/ejecucion/estados) |

## Detalle de un instante

| Acción | Resultado |
|---|---|
| Pasar el puntero por una columna | Una tarjeta describe los eventos de ese instante, cada proceso en su color |
| Clic en la columna | La tarjeta queda fija; otro clic la suelta |

## Zoom y desplazamiento

| Acción | Resultado |
|---|---|
| Botones de la cabecera | Columnas más angostas (más instantes) o más anchas (más detalle) |
| Desplazar hacia atrás | Se deja de seguir al último instante hasta volver al final |

::: tip
Se conservan los últimos 1000 instantes.
:::
