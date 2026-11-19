# Panel de monitores

La pestaña **Monitores** del inspector muestra una tarjeta por monitor, con su nombre, su
estado (libre u ocupado por un proceso), el dibujo, lo que pasó en el último instante, las
colas y las variables permanentes. Los monitores de un vector van juntos en un panel con un
selector ([Vectores de monitores](#vectores-de-monitores)). El significado de cada zona del
dibujo se explica en [Variables condición](/ejecucion/variables-condicion).

<figure>

![Pestaña Monitores con el monitor Banco ocupado por Empleado[2]: dibujo con las zonas Compitiendo, Bloqueado y Ejecutando, el relato del instante 14, la cola de entrada con seis procesos, la variable condición esperaC vacía y el comienzo de la tabla de variables, con la cola elibres](/capturas/monitores.png)

<figcaption>Monitor <code>Banco</code> en el instante 14: el dibujo, el relato del instante, las colas y las variables permanentes.</figcaption>
</figure>

## Dibujo

Las tres zonas de la cátedra, numeradas:

| Zona | Quiénes están |
|---|---|
| **1 · Compitiendo** | Los de la cola de entrada: llamaron con el monitor ocupado, o fueron despertados y todavía no reentraron |
| **2 · Bloqueado** | Los dormidos en alguna variable condición, en la fila de esa variable |
| **3 · Ejecutando** | El que tiene el acceso exclusivo, con la línea en la que está |

| Elemento | Qué significa |
|---|---|
| Nombre con un punto de color | Un proceso. Cada zona muestra hasta tres y un rótulo con la cantidad restante; las listas completas están en **Colas** |
| Borde resaltado en la zona 3 | El monitor está ocupado |
| Borde violeta en la zona 2 | Hay procesos esperando en alguna variable condición |
| Flecha resaltada (call, entra, wait, signal, return) | Algún proceso la recorrió en el último instante |
| Punto que recorre una flecha | El proceso que pasó de una zona a otra en ese instante, con su color; en signal lleva el color de acento, porque quien se mueve es el proceso despertado |
| Flecha signal punteada | La simulación terminó en deadlock: nadie puede despertar a los que esperan |

El encabezado de la tarjeta aclara cuando el dueño no está ejecutando: está en `delay`,
dormido en una variable condición de otro monitor o compitiendo por entrar a otro.

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
una cola se achica hasta desaparecer y los que siguen se corren a su lugar. Cuando el monitor
tiene más de seis variables condición, se listan hasta seis de las que tienen procesos
dormidos y un botón muestra las demás.

## Variables

| Columna | Qué muestra |
|---|---|
| Nombre y tipo | Como se declararon |
| Valor | Un escalar, su valor en la misma fila. Un arreglo o una cola se dibuja en un renglón propio, debajo de su fila y a todo el ancho: el arreglo, como celdas con el índice debajo; una `Cola` o `ColaOrdenada`, como casilleros con el frente a la izquierda y las tuplas entre paréntesis |
| Escribió | El proceso que escribió la variable por última vez y en qué instante; «valor inicial» si nadie la escribió todavía |

El valor de una variable simple y el elemento de un arreglo se destacan un momento cuando
cambian.

## Vectores de monitores

Los monitores declarados como un vector (`monitor Escritorio[id: 0..2]`) se muestran dentro de
un mismo panel, con el nombre del vector, su rango de índices y un selector. Un monitor que
no pertenece a un vector se muestra solo, como se describió arriba.

<figure>

![Panel del vector Escritorio[0..2] con el selector abierto: la opción Todos, marcada, y los monitores Escritorio[0], con 2 procesos, Escritorio[1] y Escritorio[2], sin procesos; debajo, la tarjeta de Escritorio[0], ocupado por Cliente[0]](/capturas/selector-de-monitores.png)

<figcaption>Selector del vector <code>Escritorio</code> en el instante 14. Al lado de cada monitor figura cuántos procesos tiene.</figcaption>
</figure>

| Opción del selector | Qué se muestra |
|---|---|
| **Todos** (opción inicial) | Todos los monitores del vector, ordenados por uso: primero el que tiene más procesos, contando los que compiten por entrar, el que está ejecutando y los bloqueados en sus variables condición. A igual uso, por índice |
| Un monitor del vector | Solo la tarjeta de ese monitor |

Con **Todos**, cuando el orden cambia de un instante al siguiente, las tarjetas se deslizan
hasta su lugar nuevo. Si el vector tiene más de cinco monitores, se muestran los cinco más
usados y un botón despliega el resto. La elección se conserva al cambiar de pestaña.

## Listas largas y nombres largos

Cada lista del inspector tiene un tope de elementos; al superarlo se muestran los primeros
y un botón que despliega el resto.

| Lista | Tope |
|---|---|
| Procesos de una cola | 6 |
| Elementos de un arreglo o de una cola | 6 |
| Variables condición de un monitor | 6 |
| Variables permanentes de un monitor | 8 |
| Monitores del panel, contando cada vector como uno | 8 |
| Monitores de un vector, con **Todos** | 5 |
| Procesos de la tabla **Por qué nadie avanza** | 8 |
| Variables locales de un proceso | 8 |
| Procesos de la pestaña **Procesos** | 60 |

El valor de un texto de más de 60 caracteres se corta y un botón lo muestra entero.

Un nombre que no entra en su lugar se abrevia o pasa a otro renglón, sin salirse del panel.
Si termina en un índice, se abrevia el nombre y el índice queda a la vista
(`ClientePreferencial…[12]`). El texto completo aparece al dejar el puntero sobre el
elemento abreviado.

## Deadlock

Cuando la simulación termina en deadlock, debajo de las tarjetas aparece la tabla
**Por qué nadie avanza**, con cada proceso bloqueado, dónde está y qué lo despertaría
([Diagnóstico de un deadlock](/operacion/deadlock)). Con el inspector en su ancho habitual,
cada proceso ocupa un bloque con sus dos datos; con el inspector ampliado, una fila con
tres columnas.
