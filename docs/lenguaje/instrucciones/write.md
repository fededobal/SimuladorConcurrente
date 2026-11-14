# `write`

Escribe una línea en la pantalla de salida, que se abre con el botón Salida de la barra:

```c
write("deposite ", i);          // -> deposite 3
write("total: ", a + b, " u");  // -> total: 7 u
```

Los argumentos se concatenan tal cual, sin separador: si hace falta un espacio, va en el
texto. Cada `write` es una línea y un paso del planificador, como cualquier sentencia.

Cada línea queda pintada con el color del proceso que la escribió. Eso es lo que hace útil
la pantalla: como los procesos corren en paralelo, el orden de la salida cambia entre
corridas, y verlo es la forma más directa de entender el entrelazado.

`write` se puede usar tanto en un proceso como dentro de un procedure de monitor. Acepta
cualquier tipo, incluso un arreglo o una cola enteros (`write(a)` muestra `[0, 0, 0]`).

La pantalla guarda las últimas 500 líneas; si el programa escribe más, arriba aparece un
aviso con la cantidad de líneas anteriores que se descartaron.
