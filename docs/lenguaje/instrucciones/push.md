# `push`

Agrega un elemento a una `Cola` o a una `ColaOrdenada`.

## Sintaxis

```monitores
push(c, e);               // un elemento
push(c, e1, e2);          // una tupla
push(c, (e1, e2));        // la misma tupla, entre paréntesis
push(c, (e1, (e2, e3)));  // la clave y, agrupado, el resto
```

## Funcionamiento

En una `Cola`, el elemento se agrega al final. En una `ColaOrdenada`, se inserta ordenado
de menor a mayor por la primera componente; a igual clave, queda detrás de los que ya
estaban. La cantidad y el tipo de las componentes se controlan contra la declaración de la
cola ([Colas](/lenguaje/colas)). Ocupa un paso.

## Errores

| Situación | Mensaje |
|---|---|
| No es una cola | `'x' no es una cola` |
| Cantidad de componentes | `La cola 'c' guarda (int, text): este push tiene 1 componente y se esperaban 2` |
| Tipo de una componente | `La componente 2 de 'c' es text y se está encolando un bool` |

## Ejemplo

```monitores
monitor Admin {
  Cola pedidos(int, text);
  procedure Pedido(idC: in int; S: in text) {
    push(pedidos, idC, S);
  }
}
```
