# El editor

El código se escribe con resaltado de sintaxis para el [lenguaje](/lenguaje/) de la
cátedra. Mientras la simulación corre, el editor es de solo lectura.

## Atajos

| Tecla | Qué hace |
|---|---|
| Tab | sangra la línea o las líneas seleccionadas |
| Shift + Tab | quita un nivel de sangría |
| Cmd o Ctrl + / | comenta o descomenta las líneas seleccionadas |
| Enter | mantiene la sangría de la línea anterior |

Los paréntesis, corchetes, llaves y comillas se cierran solos. Dos botones que flotan
arriba a la derecha agrandan o achican la letra; el tamaño se recuerda entre visitas.

## Dónde está cada proceso

Sobre cada renglón en el que hay un proceso aparece una franja con el nombre del proceso.
La franja toma el aspecto del [estado del proceso](./ejecucion#estados-de-un-proceso):
lisa y de su color si está ejecutando, rayada si compite por un monitor o espera en una
variable condición, punteada si está en `delay`, gris si no tuvo turno. Un proceso en
`delay` lleva al lado un contador con los segundos que faltan.

Cuando varios procesos están en el mismo renglón, se muestran hasta cinco nombres y un
botón con la cantidad restante, que los despliega.

## Errores

Un error de compilación aparece debajo del editor, con su línea marcada en rojo; la lista
completa está en [Qué avisa el compilador](/lenguaje/errores). Un error de ejecución termina
el proceso que lo provocó, que queda marcado en rojo con su línea y su mensaje; los demás
procesos siguen.
