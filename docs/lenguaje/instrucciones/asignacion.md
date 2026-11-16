# Asignación

Guarda un valor en una variable o en un elemento de arreglo.

## Sintaxis

```c
x = expr;
a[i] = expr;
x++;        // suma 1
x--;        // resta 1
a[i]++;
```

## Funcionamiento

La expresión se evalúa y su valor se guarda en el destino. `++` y `--` se aplican a
variables `int` o `double`. Cada asignación ocupa un paso.

El valor tiene que ser del tipo del destino. Las únicas conversiones automáticas son de
`int` a `double` y de un número a `text` ([Tipos y arreglos](/lenguaje/tipos)).

## Errores

| Situación | Mensaje |
|---|---|
| Destino no declarado | `Nombre no declarado en este alcance: x` |
| Tipo incompatible | `No se puede guardar un double en 'x', que es int` |
| Destino de solo lectura | `No se puede asignar a 'a' (es constante, parámetro in o iterador)` |
| Iterador de un `for` | `No se puede modificar el iterador 'i' dentro del for: lo cambia solo el paso del for` |
| Arreglo completo | `No se puede asignar el arreglo 'a' completo: hay que indicar el índice, a[índice]` |
| Cola | `No se puede asignar la cola 'c': se usa con push y pop` |
| `++` sobre un no numérico | `'t' es text: ++ y -- se aplican a números` |
| Índice fuera de rango (ejecución) | `Índice 2 fuera de rango para 'a' (tamaño 2)` |

## Ejemplo

```c
monitor Contador {
  int total = 0;
  double promedio = 0;
  procedure sumar(v: in int) {
    total = total + v;
    promedio = total;       // int a double: válido
  }
}
```
