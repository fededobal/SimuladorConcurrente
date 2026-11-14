# El panel Monitores

Un bloque por monitor: nombre, estado (libre o quién está adentro), el dibujo, las colas
y las variables.

## El dibujo

Las tres zonas de la cátedra:

| Zona | Quiénes están |
|---|---|
| **Compitiendo** | los de la cola de entrada: llamaron con el monitor ocupado, o fueron despertados y todavía no reentraron |
| **En wait** | los dormidos en alguna variable condición |
| **En monitor** | el que tiene el acceso exclusivo |

| Elemento | Qué significa |
|---|---|
| punto de color con abreviatura (C3, Em) | un proceso; con más de cinco en una zona, se indica cuántos faltan |
| flecha resaltada (Call, entra, wait, signal, Return) | algún proceso la recorrió en el último instante |
| punto con anillo en En monitor | el dueño no está ejecutando: está en `delay` o esperando en otro monitor |

| Acción | Resultado |
|---|---|
| clic en una zona o en un punto | la lista de abajo se limita a esa zona, completa, con la cantidad y un botón "ver todo" |
| Tab y Enter | lo mismo, con el teclado |
| clic en el fondo del dibujo | amplía el panel |

## Las colas

| Fila | Qué lista |
|---|---|
| Compitiendo | la cola de entrada, en orden |
| En monitor | el dueño |
| En wait(*cond*) | una fila por variable condición con alguien esperando, en el orden en que se declararon; cada cola en orden |

Solo aparecen las filas con procesos. Plegadas muestran hasta cinco y un botón despliega el
resto.

## Las variables del monitor

| Tipo | Cómo se dibuja |
|---|---|
| escalar | su valor |
| arreglo | celdas con el índice debajo |
| `Cola` o `ColaOrdenada` | casilleros con el frente a la izquierda; las tuplas entre paréntesis |

::: tip
El punto de color junto al valor indica qué proceso escribió esa variable por última vez.
Las listas largas muestran cinco elementos y un botón para ver el resto.
:::
