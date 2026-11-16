# `write`

Escribe una línea en la pantalla de salida.

## Sintaxis

```c
write(e);
write(e1, e2, ...);
```

## Funcionamiento

Los valores se concatenan sin separador y forman una línea; si hace falta un espacio, se
incluye en el texto. Acepta valores de cualquier tipo, incluidos un arreglo o una cola
completos (`write(a)` muestra `[0, 0, 0]`). Ocupa un paso.

La línea se ve en el panel [Salida](/interfaz/salida), con el instante y el nombre del
proceso en su color. Se conservan las últimas 500 líneas.

## Errores

`write` no tiene errores propios; los de sus expresiones son los de
[Expresiones](/lenguaje/expresiones).

## Ejemplo

```c
write("deposite ", i);          // deposite 3
write("total: ", a + b, " u");  // total: 7 u
```
