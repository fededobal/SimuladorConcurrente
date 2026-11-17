# Disposición de la pantalla

La pantalla del simulador se divide en cinco zonas. La figura las muestra numeradas en el
orden de la tabla, con el ejemplo Corralón pausado en el instante 14.

<figure>

![Pantalla del simulador con el ejemplo Corralón en pausa: barra arriba, editor a la izquierda, inspector a la derecha, línea de tiempo abajo a todo el ancho y barra de estado al pie, con las zonas numeradas del 1 al 5](/capturas/pantalla.png)

<figcaption>Zonas de la pantalla: 1, barra de controles; 2, editor; 3, inspector; 4, línea de tiempo; 5, barra de estado.</figcaption>
</figure>

| N.º | Zona | Dónde | Qué muestra |
|---|---|---|---|
| 1 | [Barra de controles](./barra) | Arriba | El programa abierto, Ejecutar, Paso, Detener, Repetir, velocidad, turnos, estado e instante |
| 2 | [Editor](./editor) | Izquierda | El programa, con la marca de cada proceso en su línea |
| 3 | Inspector | Derecha | Tres pestañas: [Monitores](./monitores), [Procesos y Salida](./salida) |
| 4 | [Línea de tiempo](./linea-de-tiempo) | Abajo, a todo el ancho | El estado de cada proceso en cada instante y quién tuvo cada monitor |
| 5 | Barra de estado | Al pie | Posición del cursor, cantidad de procesos y monitores, turnos, semilla, guardado y atajos |

## Barra de estado

| Dato | Qué indica |
|---|---|
| Ln, Col | Línea y columna del cursor en el código |
| Procesos y monitores | Cuántos tiene el programa en ejecución |
| Turnos y semilla | La política de turnos y la semilla de la ejecución ([Barra de controles](./barra)) |
| Guardado | Si el programa ya se guardó en el navegador ([Programas y archivos](./programas)) |
| Atajos | F5, F10 y Shift + F5; **Todos los atajos** abre la lista completa ([Atajos de teclado](/referencia/atajos)) |

## Tamaño de los paneles

| Acción | Cómo |
|---|---|
| Agrandar o achicar el inspector o la línea de tiempo | Arrastrar el borde que mira al editor; también con las flechas del teclado cuando el borde tiene el foco |
| Volver al tamaño automático | Doble clic en ese borde |
| Ensanchar el inspector | Botón de la esquina superior derecha del inspector; el mismo botón lo devuelve a su ancho |

::: tip Nota
La línea de tiempo toma el alto de sus filas, hasta algo menos de la mitad de la pantalla.
Al recargar la página, los paneles vuelven a su tamaño inicial; el programa del editor se
conserva.
:::
