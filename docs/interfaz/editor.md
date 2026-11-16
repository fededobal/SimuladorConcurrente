# Editor

El editor muestra el programa con resaltado de sintaxis. Mientras la simulación se ejecuta,
es de solo lectura; en pausa se puede modificar ([Barra de controles](./barra)).

## Atajos

| Tecla | Qué hace |
|---|---|
| Tab | Sangra la línea o las líneas seleccionadas |
| Shift + Tab | Quita un nivel de sangría |
| Cmd o Ctrl + / | Comenta o descomenta las líneas seleccionadas |
| Enter | Mantiene la sangría de la línea anterior |
| `(` `[` `{` `"` | Se cierran solos |
| Botones flotantes arriba a la derecha | Agrandan o achican la letra (se recuerda entre visitas) |

## Franja de cada proceso

Sobre el renglón en el que está cada proceso aparece una franja con su nombre, con el
aspecto de su [estado](/ejecucion/estados). La figura reúne los seis aspectos en un mismo
instante.

<figure>

![Editor con un programa de impresora compartida: franjas rayadas ladrillo en la línea del wait, rayada ocre en la llamada al monitor, punteadas verdes con contadores de 40 y 30 segundos en los delay, y en la última línea una franja lisa y otra gris](/capturas/editor-estados.png)

<figcaption>Oficina[1] y Oficina[3] esperan en <code>turno</code> (línea 7); Tecnico conserva el monitor durante su <code>delay</code> (línea 15) y por eso Oficina[4] compite por entrar (línea 26); Oficina[2] está en <code>delay</code> fuera del monitor (línea 27); en la línea 33, Contador[1] ejecuta y Contador[2] no tuvo turno.</figcaption>
</figure>

| Aspecto | Estado |
|---|---|
| Lisa, del color del proceso | Ejecutando (clara fuera del monitor, plena adentro) |
| Rayada ocre | Compitiendo por entrar a un monitor |
| Rayada ladrillo | Esperando en una variable condición |
| Punteada verde, con contador de segundos | En `delay` |
| Gris | Sin turno en este instante |

::: tip
Con varios procesos en el mismo renglón se muestran hasta cinco nombres y un botón con la
cantidad restante.
:::

## Errores

| Tipo | Dónde se ve | Qué pasa |
|---|---|---|
| De compilación | Debajo del editor, con la línea en rojo | El programa no arranca |
| De ejecución | El proceso queda en rojo, con su línea y su mensaje | Termina solo ese proceso; los demás siguen |

<figure>

![Error de compilación: falta el punto y coma al final de la línea 8, la línea 9 aparece marcada en rojo y debajo del editor se lee "línea 9: Se esperaba ';' (se encontró 'hayDato')"](/capturas/editor-error.png)

<figcaption>Error de compilación. Falta el <code>;</code> de la línea 8, pero el error se detecta al leer la línea 9, que es la que se marca.</figcaption>
</figure>

<figure>

![Error de ejecución: la línea 6 aparece marcada en rojo y debajo del editor se lee "Trabajador[3], línea 6: error de ejecución: Índice 3 fuera de rango para 'cuenta' (tamaño 3)"](/capturas/editor-error-ejecucion.png)

<figcaption>Error de ejecución. Trabajador[3] usa el índice 3 en un arreglo de tamaño 3 (índices 0 a 2); termina ese proceso y la barra indica «fin con errores».</figcaption>
</figure>
