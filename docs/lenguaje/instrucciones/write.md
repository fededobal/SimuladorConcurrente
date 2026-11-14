# `write`

Escribe una línea en la pantalla de salida, que se abre con el botón Salida de la barra:

```c
write("deposite ", i);          // -> deposite 3
write("total: ", a + b, " u");  // -> total: 7 u
```

| Regla | Detalle |
|---|---|
| Concatena sin separador | Si hace falta un espacio, va en el texto |
| Una línea, un paso | Como cualquier sentencia |
| Acepta cualquier tipo | Incluso un arreglo o una cola enteros: `write(a)` muestra `[0, 0, 0]` |
| Dónde | En un proceso o dentro de un procedure |
| Capacidad | Las últimas 500 líneas; si hay más, un aviso dice cuántas se descartaron |

::: tip
Cada línea lleva el color del proceso que la escribió. Como los procesos corren en paralelo,
el orden de la salida cambia entre corridas: verlo es la forma más directa de entender el
entrelazado.
:::
