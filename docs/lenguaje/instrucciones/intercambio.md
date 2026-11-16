# Intercambio `:=:`

Intercambia los valores de dos variables o elementos de arreglo.

## Sintaxis

```c
x :=: y;
a[i] :=: a[j];
v_actual :=: v_proxima;
```

## Funcionamiento

Se leen los dos valores y se escribe en cada lado el valor del otro. Todo ocurre en un solo
paso, de modo que ningún otro proceso observa un estado intermedio.

Cada lado se controla como el destino de una [asignación](./asignacion). Los dos lados
tienen que ser del mismo tipo: las conversiones automáticas valen en un solo sentido (de
`int` a `double`, por ejemplo) y el intercambio escribe en los dos.

## Errores

| Situación | Mensaje |
|---|---|
| Tipos distintos | `No se puede intercambiar 'a' (int) con 'd' (double): ':=:' necesita dos valores del mismo tipo` |
| Un lado no es una variable | `Se esperaba una variable después de ':=:' (se encontró '2')` |
| Un lado es de solo lectura | `No se puede asignar a 'v' (es constante, parámetro in o iterador)` |
| Arreglo completo o cola | Los mismos mensajes que en la [asignación](./asignacion) |

## Ejemplo

El planificador de disco de la teoría alterna dos variables condición con un intercambio:

```c
monitor Scheduler {
  int v_actual = 0, v_proxima = 1;
  procedure cambiarSentido() {
    v_actual :=: v_proxima;
  }
}
```
