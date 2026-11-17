# Procesos

```monitores
process Productor {
    ...
}

process Cliente[i: 1..5] {   // familia: instancia Cliente[1] .. Cliente[5]
    ...
}
```

- El iterador es de solo lectura dentro del cuerpo.
- Si `desde > hasta` no se instancia ningún proceso. Entre todas las familias y procesos
  sueltos, el programa admite hasta 5000 procesos.
- En el cuerpo se ven las locales del proceso y el iterador. Los nombres de monitor solo
  aparecen en llamadas.

## Llamadas a monitores

```monitores
Monitor.procedure();
Monitor.procedure(a, b);
Escritorio[i].procedure(a);   // arreglo de monitores: el índice es obligatorio
```

Si el monitor está libre, el proceso entra y ejecuta el cuerpo; si está ocupado, queda en
la cola de entrada, compitiendo. Al retornar se copian los parámetros `out` y se libera el
monitor. Un `out` necesita como argumento una variable o un elemento de arreglo.
