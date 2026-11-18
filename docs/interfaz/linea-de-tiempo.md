# Línea de tiempo

La línea de tiempo ocupa todo el ancho de la pantalla, debajo del editor y del inspector.
Tiene una fila por proceso, una columna por instante y, arriba, un carril por monitor.

<figure>

![Línea de tiempo del ejemplo Corralón: carril del monitor con los clientes en sucesión; filas de procesos con tramos rotulados "compite por Corralon", "Corralon" y "wait(esperaCli[1])"; el instante actual destacado y la tarjeta fija de un instante](/capturas/linea-de-tiempo.png)

<figcaption>Ejemplo Corralón con turnos en ronda. El carril muestra que el monitor pasa de un proceso a otro sin superposiciones; la tarjeta fija describe un instante.</figcaption>
</figure>

| Parte | Qué muestra |
|---|---|
| Regla | Los números de instante; el actual va en una pastilla del color de acento, con su columna sombreada |
| Carril del monitor (fondo gris) | Quién tuvo el monitor en cada instante, con su nombre sobre su color; «libre» en los huecos. Nunca hay dos nombres a la vez: esa es la exclusión mutua |
| Fila de un proceso | Su estado en cada instante. Las filas no se mueven: quedan en el orden de declaración, con una línea entre familias |
| Rótulo de un tramo | Dónde está o qué espera el proceso: `en Buffer`, `compite por Buffer`, `wait(libre)`, `en delay`. Si no entra, se usa uno más corto o ninguno |
| Leyenda | Los seis [estados](/ejecucion/estados) |

## Aspecto de cada estado

| Tramo | Estado |
|---|---|
| Color pleno del proceso | Ejecutando dentro de un monitor |
| Tono claro del color del proceso | Ejecutando su propio código |
| Borde punteado ámbar | Compitiendo por entrar a un monitor |
| Borde violeta | Esperando en una variable condición |
| Borde verde azulado | En `delay` |
| Raya gris fina | Sin turno en ese instante |

## Detalle de un instante

| Acción | Resultado |
|---|---|
| Pasar el puntero por una columna | Una tarjeta describe los eventos de ese instante, cada proceso en su color |
| Clic en la columna | La tarjeta queda fija; otro clic la suelta |

Un interbloqueo queda marcado con una raya roja en su instante y el rótulo «Interbloqueo:
nadie puede avanzar».

## Zoom y desplazamiento

| Acción | Resultado |
|---|---|
| Botones de la cabecera | Columnas más angostas (más instantes) o más anchas (más detalle) |
| Desplazar hacia atrás | Se deja de seguir al último instante hasta volver al final |
| Paso de un instante al siguiente | El tramo que continúa se alarga, el que empieza se descubre desde la izquierda y el cursor del instante actual se corre una columna, con el mismo ritmo que las marcas del editor |
| Botón de ampliar, a la derecha de la cabecera | La línea de tiempo pasa al costado del editor, a toda altura, y el inspector se oculta. El mismo botón o Escape la devuelven a su lugar |

::: tip Nota
Se conservan los últimos 1000 instantes.
:::
