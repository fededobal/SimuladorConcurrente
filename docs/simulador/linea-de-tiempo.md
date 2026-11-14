# La línea de tiempo

Una fila por proceso, una columna por instante y, arriba, un carril por monitor.

| Parte | Qué muestra |
|---|---|
| **Carril del monitor** (fondo gris) | Quién tuvo el monitor en cada instante, con su nombre sobre su color; "libre" en los huecos. Nunca hay dos nombres a la vez: esa es la exclusión mutua |
| **Fila de un proceso** | Su estado en cada instante, con el mismo aspecto que la franja del editor. Las filas no se mueven: quedan en el orden de declaración, con una línea entre familias |
| **Rótulo de un tramo** | La causa de la espera (`espera entrar a Corralon`, `wait(esperaCli[3])`) o el nombre del monitor en el que ejecuta; si no entra, se recorta con puntos suspensivos |
| **Leyenda** | Los seis [estados](./ejecucion#estados-de-un-proceso) |

## Qué pasó en un instante

| Acción | Resultado |
|---|---|
| Pasar el puntero por una columna | Una tarjeta cuenta en palabras los eventos de ese instante, cada proceso en su color |
| Clic en la columna | La tarjeta queda fija; otro clic la suelta |

## Zoom y desplazamiento

| Acción | Resultado |
|---|---|
| Botones de la cabecera | Columnas más angostas (más instantes) o más anchas (más detalle) |
| Desplazar hacia atrás | Se deja de seguir al último instante hasta volver al final |

::: tip
Se conservan los últimos 1000 instantes.
:::
