# La línea de tiempo

Una fila por proceso y una columna por instante: muestra, para toda la corrida, en qué
estado estuvo cada proceso en cada momento.

## El carril de cada monitor

Arriba de los procesos hay un carril por monitor, con fondo gris, que muestra quién tuvo el
monitor en cada instante: el nombre del proceso sobre su color, y "libre" en los huecos. La
exclusión mutua se ve de un vistazo, porque nunca hay dos nombres a la vez.

## Las filas de los procesos

Las filas quedan fijas en el orden en que se declararon los procesos, con una línea entre
familias, así se puede seguir a uno de punta a punta. Cada tramo se dibuja con el mismo
aspecto que la franja del editor y, cuando hay lugar, dice su causa: "espera entrar a
Corralon", "wait(esperaCli[3])". Dentro del monitor, el tramo lleva el nombre del monitor;
si no entra, se recorta con puntos suspensivos o se abrevia como en el dibujo del monitor.
La leyenda de la cabecera resume los seis estados.

## Qué pasó en un instante

Al pasar el puntero por una columna, una tarjeta cuenta en palabras qué pasó en ese
instante, con cada proceso en su color: quién entró a un monitor, quién hizo `wait`, a
quién despertó un `signal`. Un clic la deja fija y otro clic la suelta.

## Zoom y desplazamiento

Los botones de la cabecera cambian el ancho de las columnas, para ver más instantes de un
vistazo o menos con más detalle. La línea de tiempo sigue al último instante mientras no se
la desplace hacia atrás, y conserva los últimos 1000 instantes.
