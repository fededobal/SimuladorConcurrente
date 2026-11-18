# Panel de monitores

La pestaña **Monitores** del inspector muestra una tarjeta por monitor, con su nombre, su
estado (libre u ocupado por un proceso), el dibujo, lo que pasó en el último instante, las
colas y las variables permanentes. El significado de cada zona del dibujo se explica en
[Variables condición](/ejecucion/variables-condicion).

<figure>

![Pestaña Monitores con el monitor Corralon ocupado por un cliente: dibujo con las zonas Compiten, En wait y Adentro, el relato del instante 14, las colas de entrada y de cada variable condición y la tabla de variables con cAtenciones, comprobantes y listas](/capturas/monitores.png)

<figcaption>Monitor <code>Corralon</code> en el instante 14: el dibujo, el relato del instante, las colas y las variables permanentes.</figcaption>
</figure>

## Dibujo

Las tres zonas de la cátedra, numeradas:

| Zona | Quiénes están |
|---|---|
| **1 · Compiten** | Los de la cola de entrada: llamaron con el monitor ocupado, o fueron despertados y todavía no reentraron |
| **2 · En wait** | Los dormidos en alguna variable condición, en la fila de esa variable |
| **3 · Adentro** | El que tiene el acceso exclusivo, con la línea en la que está |

| Elemento | Qué significa |
|---|---|
| Nombre con un punto de color | Un proceso. Cada zona muestra hasta tres y un rótulo con la cantidad restante; las listas completas están en **Colas** |
| Borde resaltado en la zona 3 | El monitor está ocupado |
| Borde violeta en la zona 2 | Hay procesos esperando en alguna variable condición |
| Flecha resaltada (call, entra, wait, signal, return) | Algún proceso la recorrió en el último instante |
| Punto que recorre una flecha | El proceso que pasó de una zona a otra en ese instante, con su color; en signal lleva el color de acento, porque quien se mueve es el proceso despertado |
| Flecha signal punteada | La simulación terminó en interbloqueo: nadie puede despertar a los que esperan |

El encabezado de la tarjeta aclara cuando el dueño no está ejecutando: está en `delay` o
esperando dentro de otro monitor.

## Relato del instante

Debajo del dibujo, una línea cuenta qué pasó en el monitor en el último instante: quién
entró, quién asignó qué variable, quién hizo `wait` o `signal`. Si en ese instante no pasó
nada en el monitor, la línea no aparece.

## Colas

| Fila | Qué lista |
|---|---|
| Entrada | La cola de entrada, en orden de llegada |
| Una por variable condición | Los procesos que esperan en ella, en orden; «vacía» si no hay ninguno |

Cada cola muestra hasta seis procesos y un botón despliega el resto. El proceso que sale de
una cola se achica hasta desaparecer y los que siguen se corren a su lugar. Cuando el monitor tiene
más de seis variables condición, las vacías se pliegan en un botón que dice cuántas son.

## Variables

| Columna | Qué muestra |
|---|---|
| Nombre y tipo | Como se declararon |
| Valor | Un escalar, su valor en la misma fila. Un arreglo o una cola se dibuja en un renglón propio, debajo de su fila y a todo el ancho: el arreglo, como celdas con el índice debajo; una `Cola` o `ColaOrdenada`, como casilleros con el frente a la izquierda y las tuplas entre paréntesis |
| Escribió | El proceso que escribió la variable por última vez y en qué instante; «valor inicial» si nadie la escribió todavía |

El valor de una variable simple y el elemento de un arreglo se destacan un momento cuando
cambian.

## Interbloqueo

Cuando la simulación termina en interbloqueo, debajo de las tarjetas aparece la tabla
**Por qué nadie avanza**, con cada proceso bloqueado, dónde está y qué lo despertaría
([Diagnóstico de un interbloqueo](/operacion/interbloqueo)).
