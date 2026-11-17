# `pop`

Quita el primer elemento de una `Cola` o de una `ColaOrdenada` y lo guarda en variables.

## Sintaxis

```monitores
pop(c, x);           // un elemento
pop(c, x, y);        // una tupla, una variable por componente
pop(c, (x, y));      // lo mismo, entre paréntesis
pop(c, (x, (y, z)));
```

## Funcionamiento

Quita el elemento del frente: el más antiguo en una `Cola`, el de menor clave en una
`ColaOrdenada`. Cada componente se guarda en la variable correspondiente, que tiene que
poder recibir su tipo. Ocupa un paso.

Sobre una cola vacía es un error de ejecución. Antes de desencolar conviene consultar
[`empty`](./empty) o llevar la cuenta de los elementos en una variable.

## Errores

| Situación | Mensaje |
|---|---|
| No es una cola | `'x' no es una cola` |
| Cantidad de destinos | `La cola 'c' guarda (int, text): este pop tiene 1 componente y se esperaban 2` |
| Destino de otro tipo | `La componente 1 de 'c' es int y no se puede guardar en 'b', que es bool` |
| Destino que no es variable | `Se esperaba una variable destino para 'pop' (se encontró '3')` |
| Cola vacía (ejecución) | `pop sobre la cola vacía 'c'` |

## Ejemplo

```monitores
procedure Sig(idC: out int; S: out text) {
  while (empty(pedidos)) wait(hayPedido);
  pop(pedidos, idC, S);
}
```
