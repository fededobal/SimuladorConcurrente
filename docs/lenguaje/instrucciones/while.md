# `while`

Repite una sentencia o un bloque mientras se cumple una condición.

## Sintaxis

```monitores
while (cond) sentencia
while (cond) { ... }
while (not hayDato) wait(ocupado);
```

## Funcionamiento

La condición tiene que ser `bool` y se evalúa antes de cada vuelta. Su evaluación no ocupa
un paso propio. No existe `break`: el ciclo termina cuando la condición es falsa.

Dentro de un monitor, esperar con `while` hace que el proceso despertado por un `signal`
vuelva a evaluar la condición y, si otro proceso la cambió mientras tanto, se duerma de
nuevo. Esperar con [`if`](./if) también es válido, pero el despertado no vuelve a chequear
([Variables condición](/ejecucion/variables-condicion)).

## Errores

| Situación | Mensaje |
|---|---|
| Condición no booleana | `La condición del while tiene que ser bool y es int` |

## Ejemplo

```monitores
procedure retirar(r: out int) {
  while (not hayDato) wait(ocupado);
  r = dato;
  hayDato = false;
  signal(libre);
}
```
