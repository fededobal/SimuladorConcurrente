# `signal`

Despierta al primer proceso que espera en una variable condición.

## Sintaxis

```c
signal(cv);
signal(turno[i]);
```

## Funcionamiento

Con la disciplina *signal and continue*, quien hace el `signal` sigue dentro del monitor.
El proceso despertado sale de la cola de la variable condición y pasa a la cola de entrada,
donde compite con los demás; no tiene prioridad sobre los que llegaron después.

Si la cola de la variable condición está vacía, `signal` no tiene efecto y no deja
registro: un `wait` posterior se demora igual. Cuando el aviso puede llegar antes que la
espera, el hecho tiene que guardarse en una variable permanente
([El programa se detiene](/problemas/el-programa-se-detiene)).

## Errores

Los mismos que [`wait`](./wait#errores).

## Ejemplo

```c
procedure Salir() {
  if (esperando > 0) {
    esperando--;
    signal(cola);
  } else libre = true;
}
```
