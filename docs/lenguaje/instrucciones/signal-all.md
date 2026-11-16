# `signal_all`

Despierta a todos los procesos que esperan en una variable condición.

## Sintaxis

```c
signal_all(cv);
signal_all(turno[i]);
```

## Funcionamiento

Todos los procesos de la cola de la variable condición pasan a la cola de entrada y la
variable queda vacía. Quien hace el `signal_all` sigue dentro del monitor. Los despertados
entran de a uno, cuando el monitor se libera, y cada uno vuelve a evaluar su condición.

Es la operación adecuada para una barrera: el último en llegar despierta a todos.

## Errores

Los mismos que [`wait`](./wait#errores).

## Ejemplo

```c
monitor Barrera {
  bool abierta = false;
  cond puerta;
  procedure esperar() {
    while (not abierta) wait(puerta);
  }
  procedure abrir() {
    abierta = true;
    signal_all(puerta);
  }
}
```
