# El editor

Código con resaltado de sintaxis para el [lenguaje](/lenguaje/) de la cátedra. Mientras la
simulación corre, es de solo lectura.

## Atajos

| Tecla | Qué hace |
|---|---|
| Tab | sangra la línea o las líneas seleccionadas |
| Shift + Tab | quita un nivel de sangría |
| Cmd o Ctrl + / | comenta o descomenta las líneas seleccionadas |
| Enter | mantiene la sangría de la línea anterior |
| `(` `[` `{` `"` | se cierran solos |
| Botones flotantes arriba a la derecha | agrandan o achican la letra (se recuerda entre visitas) |

## La franja de cada proceso

Sobre el renglón en el que está cada proceso aparece una franja con su nombre, con el
aspecto de su [estado](./ejecucion#estados-de-un-proceso):

| Aspecto | Estado |
|---|---|
| lisa, del color del proceso | ejecutando (clara fuera del monitor, plena adentro) |
| rayada ocre | compitiendo por entrar a un monitor |
| rayada ladrillo | esperando en una variable condición |
| punteada verde, con contador de segundos | en `delay` |
| gris | sin turno en este instante |

::: tip
Con varios procesos en el mismo renglón se muestran hasta cinco nombres y un botón con la
cantidad restante.
:::

## Errores

| Tipo | Dónde se ve | Qué pasa |
|---|---|---|
| de compilación | debajo del editor, con la línea en rojo | el programa no arranca |
| de ejecución | el proceso queda en rojo, con su línea y su mensaje | termina solo ese proceso; los demás siguen |
