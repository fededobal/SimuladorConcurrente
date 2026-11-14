# `write`

Escribe una línea en la pantalla de salida, que se abre con el botón Salida de la barra:

```c
write("deposite ", i);          // -> deposite 3
write("total: ", a + b, " u");  // -> total: 7 u
```

| Regla | Detalle |
|---|---|
| concatena sin separador | si hace falta un espacio, va en el texto |
| una línea, un paso | como cualquier sentencia |
| acepta cualquier tipo | incluso un arreglo o una cola enteros: `write(a)` muestra `[0, 0, 0]` |
| dónde | en un proceso o dentro de un procedure |
| capacidad | las últimas 500 líneas; si hay más, un aviso dice cuántas se descartaron |

::: tip
Cada línea lleva el color del proceso que la escribió. Como los procesos corren en paralelo,
el orden de la salida cambia entre corridas: verlo es la forma más directa de entender el
entrelazado.
:::
