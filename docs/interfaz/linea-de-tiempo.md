# Línea de tiempo

La línea de tiempo ocupa todo el ancho de la pantalla, debajo del editor y del inspector.
Tiene una fila por proceso, una columna por instante y, arriba, un carril por monitor.

<figure>

![Línea de tiempo del ejemplo del banco: un carril para el monitor Banco y uno para cada Escritorio, con los procesos que los ocuparon en sucesión; filas de los clientes con tramos rotulados "compite por Banco", "en Banco", "Escritorio[0]" y "wait(vcCliente)"; el instante 22 destacado y, junto a la columna del instante 10, su cartel](/capturas/linea-de-tiempo.png)

<figcaption>Ejemplo Problema completo: banco y escritorios, con turnos en ronda. Cada carril muestra que su monitor pasa de un proceso a otro sin superposiciones; el cartel describe el instante 10, elegido con un clic.</figcaption>
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
| Borde violeta | Dormido en una variable condición |
| Borde verde azulado | En `delay` |
| Raya gris fina | Sin turno en ese instante |

## Detalle de un instante

| Acción | Resultado |
|---|---|
| Pasar el puntero por una columna | La columna se resalta y el puntero cambia a la mano; no aparece ningún texto |
| Clic en la columna | Aparece un cartel con los eventos de ese instante, cada proceso en su color, y la columna queda marcada |
| Mover el puntero sobre la línea de tiempo | El cartel acompaña al puntero, corrido hacia un costado, de modo que no tapa lo que se está mirando. Fuera de la línea de tiempo, el cartel se queda donde estaba |
| Otro clic en la misma columna, o Escape | El cartel se cierra |
| Clic en otra columna | El cartel pasa a describir ese instante |

El cartel lista hasta seis eventos e indica cuántos más hubo.

Un deadlock queda marcado con una raya roja en su instante y el rótulo «Deadlock:
nadie puede avanzar».

## Columna de nombres

La columna de la izquierda, con los nombres de los monitores y de los procesos, toma al
empezar el ancho del nombre más largo, hasta 300 px o el 40 % del panel.

| Acción | Resultado |
|---|---|
| Arrastrar el borde derecho de la columna | La columna se ensancha o se angosta, entre 96 y 480 px |
| Flechas izquierda y derecha, con el borde enfocado | Lo mismo, de a 16 px |
| Doble clic en el borde | Vuelve al ancho automático |

Un nombre que no entra se abrevia y conserva el índice (`Escrit…[2]`); el nombre completo
aparece al dejar el puntero encima. Con la columna angosta, los carriles no llevan la
etiqueta «monitor» y se distinguen por el fondo gris.

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
