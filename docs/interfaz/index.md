# Disposición de la pantalla

La pantalla del simulador se divide en cinco zonas. La figura las muestra numeradas en el
orden de la tabla, con el ejemplo Corralón pausado en el instante 14.

<figure>

![Pantalla del simulador con el ejemplo Corralón en pausa: barra arriba, editor a la izquierda, línea de tiempo abajo y panel de monitores a la derecha, con las zonas numeradas del 1 al 5](/capturas/pantalla.png)

<figcaption>Zonas de la pantalla: 1, barra de controles; 2, editor; 3, línea de tiempo; 4, monitores; 5, botón que abre la salida.</figcaption>
</figure>

| N.º | Zona | Dónde | Qué muestra |
|---|---|---|---|
| 1 | [Barra de controles](./barra) | Arriba | Ejecutar, pausar, paso, detener, velocidad, turnos, ejemplos, salida, estado |
| 2 | [Editor](./editor) | Izquierda, arriba | El programa, con una franja sobre la línea de cada proceso |
| 3 | [Línea de tiempo](./linea-de-tiempo) | Izquierda, abajo | El estado de cada proceso en cada instante y quién tuvo cada monitor |
| 4 | [Monitores](./monitores) | Derecha | El dibujo de cada monitor, sus colas y sus variables |
| 5 | [Salida](./salida) | Se abre desde la barra | Lo que escriben los procesos con `write` |

## Tamaño de los paneles

| Acción | Cómo |
|---|---|
| Agrandar o achicar un panel | Arrastrar el borde que mira al editor; también con las flechas del teclado cuando el borde tiene el foco |
| Volver al tamaño automático | Doble clic en ese borde |
| Ampliar un panel | Botón de la esquina superior derecha del panel, o clic en el fondo del dibujo de un monitor |
| Cerrar el panel ampliado | El mismo botón, o la tecla Escape |

::: tip
El panel ampliado ocupa toda la columna derecha y el editor queda siempre a la vista. Al
recargar la página, todo vuelve a su tamaño y lugar iniciales.
:::
