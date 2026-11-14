# El panel Monitores

Un bloque por monitor, con su nombre y su estado: libre, o quién está adentro (y, si ese
proceso está en `delay` o esperando en otro monitor, la aclaración).

## El dibujo

Reproduce las tres zonas de la cátedra:

- **Compitiendo**: los procesos en la cola de entrada, que llamaron a un procedure con el
  monitor ocupado o fueron despertados y todavía no reentraron.
- **En wait**: los dormidos en alguna variable condición.
- **En monitor**: el que tiene el acceso exclusivo.

Los procesos son puntos de su color con su abreviatura (C3 para Cliente[3], Em para
Empleado); si en una zona hay más de cinco, se indica cuántos faltan. Las flechas Call,
entra, wait, signal y Return se resaltan cuando algún proceso las recorrió en el último
instante. Un punto con anillo en la zona En monitor es un dueño que no está ejecutando: está
en `delay` o esperando en otro monitor.

Al tocar una zona, o un punto, la lista de abajo se limita a esa zona, completa, con la
cantidad de procesos y un botón para volver a ver todo. Las zonas también se recorren con
Tab y se eligen con Enter. Un clic en el fondo del dibujo amplía el panel.

## Las colas

Debajo del dibujo se listan los procesos de cada zona: Compitiendo, En monitor y una fila
"En wait(cond)" por cada variable condición con alguien esperando, en el orden en que se
declararon. Cada lista respeta el orden de la cola. Solo aparecen las filas con procesos;
plegadas muestran hasta cinco y un botón despliega el resto.

## Las variables del monitor

Bajo el título Variables del monitor, cada variable permanente con su tipo y su valor,
dibujada según su estructura:

- un escalar, con su valor;
- un arreglo, como celdas con su índice debajo;
- una `Cola` o `ColaOrdenada`, como casilleros con el frente a la izquierda; las tuplas van
  entre paréntesis, como se escribieron.

El punto de color junto al valor indica qué proceso escribió esa variable por última vez.
Las listas largas muestran cinco elementos y un botón para ver el resto.

## Ampliado

Con el botón de la esquina, o con un clic en el fondo del dibujo, el panel ocupa toda la
columna derecha: el dibujo se agranda y las listas tienen más lugar.
