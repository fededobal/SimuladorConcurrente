# Panel de monitores

El panel muestra un bloque por monitor con su nombre, su estado (libre o el proceso que está
dentro), el dibujo, las colas y las variables permanentes. El significado de cada zona del
dibujo se explica en [Variables condición](/ejecucion/variables-condicion).

## Dibujo

Las tres zonas de la cátedra:

| Zona | Quiénes están |
|---|---|
| **Compitiendo** | Los de la cola de entrada: llamaron con el monitor ocupado, o fueron despertados y todavía no reentraron |
| **En wait** | Los dormidos en alguna variable condición |
| **En monitor** | El que tiene el acceso exclusivo |

| Elemento | Qué significa |
|---|---|
| Punto de color con abreviatura | Un proceso: la inicial y el índice en una familia (`Cliente[3]` es C3), dos letras en un proceso suelto (`Productor` es Pr). Con más de seis procesos en una zona se dibujan cinco y un rótulo +n con el resto |
| Flecha resaltada (Call, entra, wait, signal, Return) | Algún proceso la recorrió en el último instante |
| Punto con anillo en En monitor | El dueño no está ejecutando: está en `delay` o esperando en otro monitor |

| Acción | Resultado |
|---|---|
| Clic en una zona o en un punto | La lista de abajo se limita a esa zona, completa, con la cantidad y un botón "ver todo" |
| Tab y Enter | Lo mismo, con el teclado |
| Clic en el fondo del dibujo | Amplía el panel |

## Colas

| Fila | Qué lista |
|---|---|
| Compitiendo | La cola de entrada, en orden |
| En monitor | El dueño |
| En wait(*cond*) | Una fila por variable condición con alguien esperando, en el orden en que se declararon; cada cola en orden |

Solo aparecen las filas con procesos. Plegadas muestran hasta cinco y un botón despliega el
resto.

## Variables del monitor

| Tipo | Cómo se dibuja |
|---|---|
| Escalar | Su valor |
| Arreglo | Celdas con el índice debajo |
| `Cola` o `ColaOrdenada` | Casilleros con el frente a la izquierda; las tuplas entre paréntesis |

::: tip
El punto de color junto al valor indica qué proceso escribió esa variable por última vez.
Las listas largas muestran cinco elementos y un botón para ver el resto.
:::
