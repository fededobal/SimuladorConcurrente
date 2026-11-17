# `wait`

Demora al proceso en una variable condición y libera el monitor.

## Sintaxis

```monitores
wait(cv);
wait(turno[i]);   // con un arreglo de cond, el índice es obligatorio
```

## Funcionamiento

El proceso pasa al final de la cola de la variable condición y deja el monitor libre para
otro proceso. Siempre se demora, aunque la condición que espera ya se cumpla. Vuelve a
competir por el monitor cuando otro proceso hace [`signal`](./signal) o
[`signal_all`](./signal-all) sobre esa variable, y al reingresar continúa en la sentencia
siguiente al `wait`.

Solo se usa dentro de un procedure. El dibujo del monitor muestra al proceso en la zona
**En wait** ([Variables condición](/ejecucion/variables-condicion)).

## Errores

| Situación | Mensaje |
|---|---|
| Fuera de un procedure | `wait/signal/signal_all solo pueden usarse dentro de un procedure de monitor` |
| En la inicialización del monitor | `El código de inicialización del monitor M no puede llamar a monitores ni usar wait, signal o delay` |
| Variable no declarada | `Variable condición no declarada: c` |
| Arreglo sin índice | `La cond 'c' es un arreglo: falta el índice` |
| Índice fuera de rango (ejecución) | `Índice 5 fuera de rango para la cond 'c' (tamaño 2)` |
| Con prioridad: `wait(cv, rank)` | `Se esperaba ')' (se encontró ',')` |

## Ejemplo

```monitores
procedure depositar(d: in int) {
  while (hayDato) wait(libre);
  dato = d;
  hayDato = true;
  signal(ocupado);
}
```
