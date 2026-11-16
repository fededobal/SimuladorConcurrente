# `empty`

Indica si una cola no tiene elementos.

## Sintaxis

```c
empty c
empty(c)
```

## Funcionamiento

Es una expresión de tipo `bool`, no una sentencia: se usa en una condición o en una
asignación. Vale `true` si la cola no tiene elementos.

Solo se aplica a una `Cola` o a una `ColaOrdenada`. Como en la práctica de la cátedra, no
se puede consultar si una variable condición tiene procesos esperando: para eso se lleva un
contador ([Notación de la cátedra](/introduccion/notacion-de-la-catedra)).

## Errores

| Situación | Mensaje |
|---|---|
| No es una cola | `'x' no es una cola: empty se usa con una Cola o una ColaOrdenada` |
| Sobre una variable condición | `En la práctica no se permite preguntar si una variable condición está vacía` |

## Ejemplo

```c
procedure Sig(S: out text) {
  while (empty(C)) wait(hayPedido);
  pop(C, S);
}
```
