# La pantalla

El simulador ocupa una sola pantalla con una barra arriba y tres zonas: el editor y, debajo,
la línea de tiempo, a la izquierda; el panel Monitores, a la derecha. La salida se abre con
un botón de la barra. Cada panel se agranda o se achica arrastrando el borde que mira al
editor, y los paneles que no son el editor se amplían con el botón de su esquina superior
derecha: el panel ampliado pasa a ocupar toda la columna derecha, junto al editor, y se
cierra con el mismo botón o con la tecla Escape. Al recargar la página, todo vuelve a su
tamaño inicial.

## La barra

- **Ejecutar** y **Pausar**: la simulación avanza sola, un instante por vez. **Paso**
  avanza un solo instante. **Detener** vuelve al principio del programa.
- **Velocidad**: cuánto dura cada instante en pantalla. Lento, normal, rápido y muy rápido
  corresponden a 1,2 s, 0,6 s, 0,3 s y 0,12 s por instante.
- **Turnos**: la política de planificación. *Al azar*: en cada instante, cada proceso listo
  entra al turno con una probabilidad del 80 % y al menos uno avanza; unos van más rápido
  que otros, como en la realidad. *En ronda*: avanzan todos los procesos listos, por turno.
  Se puede cambiar durante la ejecución.
- **Ejemplos**: carga uno de los [programas de ejemplo](/referencia/ejemplos). Si el editor
  tiene un programa propio, pide confirmación antes de reemplazarlo.
- **Salida**: abre la pantalla de salida con lo que escriben los procesos con `write`. El
  número al lado es la cantidad de líneas.
- A la derecha, el estado de la simulación (listo, ejecutando, en pausa, fin, deadlock o
  error) y el número del instante actual.

## El editor

El código se escribe con resaltado de sintaxis para el lenguaje de la cátedra. La tecla Tab
sangra, Shift+Tab quita la sangría, y Cmd o Ctrl + / comenta y descomenta las líneas
seleccionadas. Los paréntesis, corchetes, llaves y comillas se cierran solos. Dos botones
que flotan arriba a la derecha agrandan o achican la letra.

Mientras la simulación corre, el editor es de solo lectura y sobre cada renglón en el que
hay un proceso aparece una franja con el nombre del proceso y el aspecto de su estado:

| Estado | Qué significa | Cómo se ve |
|---|---|---|
| Ejecutando en el proceso | avanzó en el último instante, fuera de los monitores | franja lisa del color del proceso, tono claro |
| Ejecutando en el monitor | avanzó en el último instante, con un monitor tomado | franja lisa del color del proceso |
| Compitiendo | espera en la cola de entrada de un monitor | rayado ocre, borde punteado |
| Esperando | dormido en una variable condición | rayado ladrillo, borde punteado |
| En delay | demorado por un `delay`; si está en un monitor, lo sigue teniendo | punteado verde y un contador con los segundos que faltan |
| Sin turno | podía avanzar, pero no le tocó en este instante | franja gris |

Cuando varios procesos están en el mismo renglón, se muestran hasta cinco nombres y un botón
con la cantidad restante, que los despliega.

Un error de compilación aparece debajo del editor, con su línea marcada en rojo. Un error
de ejecución termina el proceso que lo provocó, que queda marcado en rojo con su línea y su
mensaje; los demás siguen.

## La línea de tiempo

Una fila por proceso y una columna por instante. Arriba de los procesos hay un carril por
monitor, con fondo gris, que muestra quién tuvo el monitor en cada instante: el nombre del
proceso sobre su color, y "libre" en los huecos. La exclusión mutua se ve de un vistazo,
porque nunca hay dos nombres a la vez.

Las filas de los procesos quedan fijas en el orden en que se declararon, con una línea
entre familias. Cada tramo se dibuja con el mismo aspecto que la franja del editor y, cuando
hay lugar, dice su causa: "espera entrar a Corralon", "wait(esperaCli[3])". Dentro del
monitor, el tramo lleva el nombre del monitor; si no entra, se recorta con puntos
suspensivos o se abrevia como en el dibujo del monitor.

Al pasar el puntero por una columna, una tarjeta cuenta en palabras qué pasó en ese
instante, con cada proceso en su color; un clic la deja fija y otro clic la suelta. Los
botones de la cabecera cambian el ancho de las columnas. La línea de tiempo conserva los
últimos 1000 instantes y sigue al último mientras no se la desplace hacia atrás.

## El panel Monitores

Cada monitor es un bloque con su nombre y su estado (libre, o quién está adentro). El dibujo
reproduce las tres zonas de la teoría: **Compitiendo**, los procesos en la cola de entrada;
**En wait**, los dormidos en alguna variable condición; **En monitor**, el que tiene el
acceso exclusivo. Los procesos son puntos de su color con su abreviatura (C3 para
Cliente[3], Em para Empleado); si en una zona hay más de cinco, se indica cuántos faltan.
Las flechas Call, entra, wait, signal y Return se resaltan cuando algún proceso las recorrió
en el último instante. Un punto con anillo en la zona En monitor es un dueño que no está
ejecutando: está en `delay` o esperando en otro monitor.

Al tocar una zona, o un punto, la lista de abajo se limita a esa zona, completa, con la
cantidad de procesos y un botón para volver a ver todo. Las zonas también se recorren con
Tab y se eligen con Enter.

Debajo del dibujo se listan los procesos de cada zona: Compitiendo, En monitor y una fila
"En wait(cond)" por cada variable condición con alguien esperando, en el orden en que se
declararon. Solo aparecen las filas con procesos; plegadas muestran hasta cinco y un botón
despliega el resto.

Por último, bajo el título Variables del monitor, cada variable permanente con su tipo y su
valor, dibujada según su estructura: un escalar con su valor; un arreglo como celdas con su
índice; una `Cola` o `ColaOrdenada` como casilleros con el frente a la izquierda, y las
tuplas entre paréntesis. El punto de color junto al valor indica qué proceso escribió esa
variable por última vez. Las listas largas muestran cinco elementos y un botón para ver el
resto.

## La salida

Lo que los procesos escriben con `write`, una línea por llamada, con el instante y el nombre
del proceso en su color. Guarda las últimas 500 líneas. Como los procesos corren en
paralelo, el orden de la salida cambia entre corridas: verlo es la forma más directa de
entender el entrelazado.

## Fin, interbloqueo y errores

La simulación termina cuando todos los procesos terminaron. Si ningún proceso puede avanzar
y no todos terminaron, el estado pasa a **deadlock** y el panel Monitores muestra dónde
quedó cada uno. Si algún proceso está en `delay`, el simulador espera a que termine antes
de declarar un interbloqueo. Después de un error de ejecución, el estado dice "fin con
errores" o "deadlock tras un error", para distinguir el problema del programa de un
problema de sincronización.
