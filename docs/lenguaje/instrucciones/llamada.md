# Llamada a monitor

Ejecuta un procedure de un monitor con exclusión mutua.

## Sintaxis

```monitores
Monitor.procedure();
Monitor.procedure(a, b);
Escritorio[i].procedure(a);   // arreglo de monitores: el índice es obligatorio
```

## Funcionamiento

Si el monitor está libre, el proceso entra y ejecuta el procedure. Si está ocupado, el
proceso queda en la cola de entrada, compitiendo con los demás. Al retornar, los valores de
los parámetros `out` se copian en los argumentos y el monitor se libera
([Acceso al monitor](/ejecucion/acceso-al-monitor)).

Los argumentos se corresponden con los parámetros por posición. Un argumento para un
parámetro `out` tiene que ser una variable o un elemento de arreglo.

Un procedure puede llamar a otro monitor, pero no a un procedure de su propio monitor. El
proceso conserva el primer monitor hasta que la llamada al segundo termina.

## Errores

| Situación | Mensaje |
|---|---|
| Monitor inexistente | `Monitor no declarado: M` |
| Procedure inexistente | `El monitor M no tiene un procedure 'g'` |
| Cantidad de argumentos | `La llamada a M.f espera 1 argumento(s) y recibió 0` |
| Tipo de un argumento | `No se puede guardar un text en 'a', que es int` |
| Argumento `out` que no es variable | `El argumento para el parámetro 'r' (out) debe ser una variable o un elemento de arreglo` |
| Arreglo de monitores sin índice | `El monitor E es un arreglo: falta el índice, E[índice].f(...)` |
| Índice en un monitor simple | `El monitor M no es un arreglo: se llama sin índice` |
| Llamada al propio monitor | `Un procedure de M no puede llamar a M.a: el proceso ya está dentro del monitor` |
| Índice fuera de rango (ejecución) | `Índice 3 fuera de rango para el monitor 'E' (va de 0 a 2)` |
| Reingreso a un monitor retenido (ejecución) | `P ya está dentro de A y no puede volver a llamarlo desde otro monitor` |

## Ejemplo

```monitores
monitor Banco {
  int atendidos = 0;
  procedure atender(id: in int; turno: out int) {
    atendidos++;
    turno = atendidos;
  }
}

process Cliente[i: 1..3] {
  int t;
  Banco.atender(i, t);
  write("cliente ", i, " turno ", t);
}
```
