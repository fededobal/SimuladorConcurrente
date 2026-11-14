# `push`, `pop` y `empty`

Operan sobre una `Cola` o una `ColaOrdenada`:

```c
push(c, e);               // encola un elemento
push(c, e1, e2);          // encola una tupla
push(c, (e1, e2));        // lo mismo
push(c, (e1, (e2, e3)));  // la clave y, agrupado, el resto
pop(c, x);                // desencola el frente en x
pop(c, x, y);             // desestructura la tupla
pop(c, (x, (y, z)));
bool v = empty c;         // true si no tiene elementos; también empty(c)
```

`push` y `pop` son sentencias y ocupan un paso cada una; `empty` es una expresión. La
cantidad y el tipo de las componentes se controlan al compilar contra la declaración de la
cola; `pop` sobre una cola vacía es error de ejecución. Los detalles, incluidas las formas
válidas de los paréntesis, están en [Colas](../colas).
