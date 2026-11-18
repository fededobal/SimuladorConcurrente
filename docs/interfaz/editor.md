# Editor

El editor muestra el programa con resaltado de sintaxis. Mientras la simulación se ejecuta,
es de solo lectura; en pausa se puede modificar ([Barra de controles](./barra)).

Como en un editor de código, unas líneas verticales finas marcan cada nivel de sangría, y la
del bloque en el que está el cursor se ve más marcada. El renglón del cursor lleva un
recuadro y su número se destaca en el margen; el recuadro no aparece con texto seleccionado
ni cuando el editor no tiene el foco. Las flechas de las puntas de la barra de desplazamiento
mueven el código de a poco; apretadas, siguen moviéndolo.

## Atajos

| Tecla | Qué hace |
|---|---|
| Tab | Sangra la línea o las líneas seleccionadas |
| Shift + Tab | Quita un nivel de sangría |
| Cmd o Ctrl + / | Comenta o descomenta las líneas seleccionadas |
| Enter | Mantiene la sangría de la línea anterior |
| `(` `[` `{` `"` | Se cierran solos |
| Botones del encabezado del editor | Agrandan o achican la letra (se recuerda entre visitas) |

## Constantes

El botón **Constantes** del encabezado del editor abre un menú con las
[constantes](/lenguaje/constantes) del programa, como la `N` de los enunciados. El número
junto al botón indica cuántas tiene.

| Acción | Resultado |
|---|---|
| **Agregar una constante** | Suma una fila con un nombre libre (`N`, `M`, `P`...) y el valor 5 |
| Cambiar el nombre o el valor de una fila | La línea `#define` del código se reescribe al instante |
| Ícono de la derecha de una fila | Quita la constante |

<figure>

![Encabezado del editor con el menú Constantes abierto: explica que las constantes no son variables y muestra una fila con el nombre N y el valor 5, el ícono para quitarla y la opción Agregar una constante; en el código se ve la línea #define N 5](/capturas/constantes.png)

<figcaption>Menú Constantes del ejemplo Exclusión mutua implícita. La fila <code>N = 5</code> corresponde a la línea <code>#define N 5</code> del código.</figcaption>
</figure>

El menú escribe las líneas `#define` al principio del código; también se pueden escribir a
mano. Un nombre repetido o reservado, o un valor que no es un entero sin signo, se marca en
rojo y no se guarda hasta corregirlo. Durante una ejecución el menú está deshabilitado, igual
que el resto del editor.

## Marcas de los procesos

Mientras hay una simulación, el editor marca la línea en la que está cada proceso con tres
elementos que no tapan el código:

| Elemento | Dónde | Qué indica |
|---|---|---|
| Franja lisa | Todo el renglón | Que hay procesos en esa línea; toma el color del más activo |
| Chip con la inicial | Margen, junto al número de línea | Qué proceso es, con su color |
| Etiqueta | Al final del código | El nombre del proceso y lo que está haciendo, con el ícono y el color de su [estado](/ejecucion/estados) |

Cuando un proceso avanza, su franja, su chip y su etiqueta se deslizan hasta el renglón nuevo.
El deslizamiento dura una parte del instante, de modo que cada marca queda quieta antes del
paso siguiente. Además, el chip de cada proceso que avanzó en el instante late una vez (un
anillo de su color que se abre y se desvanece): señala quién se movió aunque haya quedado en
el mismo renglón. Si el proceso cambia de estado sin cambiar de renglón, su etiqueta pasa de
un color al otro.

La figura reúne los seis estados en un mismo instante.

<figure>

![Editor con un programa de impresora compartida: etiquetas violetas en la línea del wait, etiqueta ámbar en la llamada al monitor, etiquetas verde azulado con los instantes que faltan en los delay y, en el contador, una etiqueta del color del proceso y otra gris](/capturas/editor-estados.png)

<figcaption>Dos oficinas duermen en <code>turno</code>; el técnico conserva el monitor durante su <code>delay</code> y por eso otra oficina compite por entrar; una oficina está en <code>delay</code> fuera del monitor; de los dos contadores, uno ejecuta y el otro no tuvo turno.</figcaption>
</figure>

| Etiqueta | Estado |
|---|---|
| Del color del proceso, con un triángulo | Ejecutando; dentro de un monitor dice en cuál |
| Ámbar con borde punteado, con un reloj de arena | Compitiendo por entrar a un monitor |
| Violeta, con una luna | Dormido en una variable condición |
| Verde azulado, con un cronómetro | En `delay`, con los instantes que faltan |
| Gris, con una raya | Sin turno en este instante |

Los procesos que están en la misma línea, en el mismo estado y en el mismo lugar comparten
una etiqueta («Jugador ×5 · dormidos en wait(espera)»). Por renglón se muestran hasta
dos etiquetas y un «+n» con el resto. En un renglón largo, la etiqueta se ancla al borde
visible del editor.

Si la línea de un proceso queda fuera de la vista, un aviso en el borde superior o inferior
del editor lo indica; un clic lleva hasta esa línea. El encabezado del editor muestra la
inicial y el nombre de cada proceso o familia.

## Errores

| Tipo | Dónde se ve | Qué pasa |
|---|---|---|
| De compilación | Debajo del editor, con la línea en rojo | El programa no arranca |
| De ejecución | El proceso queda en rojo, con su línea y su mensaje | Termina solo ese proceso; los demás siguen |

<figure>

![Error de compilación: falta el punto y coma al final de la línea 12, la línea 13 aparece marcada en rojo y debajo del editor se lee "línea 13: Se esperaba ';' (se encontró 'hayDato')"](/capturas/editor-error.png)

<figcaption>Error de compilación. Falta el <code>;</code> de la línea 12, pero el error se detecta al leer la línea 13, que es la que se marca.</figcaption>
</figure>

<figure>

![Error de ejecución: la línea 5 aparece marcada en rojo y debajo del editor se lee "Trabajador[3], línea 5: error de ejecución: Índice 3 fuera de rango para 'cuenta' (tamaño 3)"](/capturas/editor-error-ejecucion.png)

<figcaption>Error de ejecución. Trabajador[3] usa el índice 3 en un arreglo de tamaño 3 (índices 0 a 2); termina ese proceso y la barra indica «Fin con errores».</figcaption>
</figure>
