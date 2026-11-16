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
aspecto de su [estado](/ejecucion/estados):

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
