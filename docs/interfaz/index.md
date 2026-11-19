# Disposición de la pantalla

La pantalla del simulador se divide en cinco zonas. La figura las muestra numeradas en el
orden de la tabla, con el ejemplo Problema completo: banco y escritorios pausado en el
instante 14.

<figure>

![Pantalla del simulador con el ejemplo del banco en pausa: barra arriba, editor a la izquierda, inspector a la derecha, línea de tiempo abajo a todo el ancho y barra de estado al pie, con las zonas numeradas del 1 al 5](/capturas/pantalla.png)

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

## Continuidad entre instantes

De un instante al siguiente, lo que cambia en la pantalla se mueve o se destaca en lugar de
reemplazarse de golpe, para poder seguir a cada proceso con la vista.

| Dónde | Qué se ve |
|---|---|
| Barra de controles | El número de instante entra desde abajo; el estado cambia de color con una transición |
| Editor | La franja, el chip y la etiqueta de cada proceso se deslizan a su renglón; el chip del que avanzó late una vez ([Editor](./editor)) |
| Pestaña Monitores | Un punto recorre la flecha que usó cada proceso; los nombres entran y salen de las zonas y de las colas; el valor que cambia se destaca ([Monitores](./monitores)) |
| Pestaña Procesos | Una barra de color marca a los que avanzaron; el estado, la línea y las variables locales que cambian se destacan ([Procesos y salida](./salida)) |
| Pestaña Salida | Cada línea nueva entra con un fundido; el contador de la pestaña da un salto cuando cambia |
| Línea de tiempo | Los tramos se alargan, el cursor se corre una columna y el desplazamiento lo acompaña ([Línea de tiempo](./linea-de-tiempo)) |

Todos los movimientos duran una parte del instante, según la velocidad elegida.

::: tip Nota
Si el sistema operativo tiene activada la opción de reducir el movimiento, los cambios se
muestran de una vez, sin animaciones.
:::

## Tamaño de los paneles

| Acción | Cómo |
|---|---|
| Agrandar o achicar el inspector o la línea de tiempo | Arrastrar el borde que mira al editor; también con las flechas del teclado cuando el borde tiene el foco |
| Volver al tamaño automático | Doble clic en ese borde |
| Ampliar la línea de tiempo | Botón de la esquina superior derecha de la línea de tiempo: pasa al costado del editor, a toda altura, y el inspector se oculta. El mismo botón o Escape la devuelven a su lugar |
| Ampliar el inspector | Botón de la esquina superior derecha del inspector: queda más ancho y a toda la altura, delante de la línea de tiempo, que sigue a la vista debajo del editor. El mismo botón o Escape lo devuelven a su lugar |

::: tip Nota
La línea de tiempo toma el alto de sus filas, hasta algo menos de la mitad de la pantalla.
Al recargar la página, los paneles vuelven a su tamaño inicial; el programa del editor se
conserva.
:::
