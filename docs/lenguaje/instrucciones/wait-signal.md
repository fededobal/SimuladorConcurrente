# `wait`, `signal` y `signal_all`

Solo dentro de un procedure, es decir, con el monitor tomado:

```c
wait(cv);        // siempre demora; libera el monitor
signal(cv);      // despierta al primero de cv; si está vacía no hace nada
signal_all(cv);  // despierta a todos los de cv
wait(turno[i]);  // con un arreglo de cond, el índice es obligatorio
```

Disciplina *signal and continue*: el que señaliza sigue con el monitor tomado y el
despertado pasa a competir en la cola de entrada. Por eso la condición normalmente se
re-evalúa con `while`, no con `if`.

Las tres son sentencias y ocupan un paso del planificador. Un `signal` sobre una cola vacía
no deja ningún rastro: si el `signal` puede llegar antes que el `wait`, el estado que
espera el otro proceso tiene que guardarse en una variable permanente, como hace el ejemplo
[Guardia](/referencia/ejemplos#guardia-colaordenada-con-tuplas) con `atendido[id]`.

Usarlas fuera de un procedure, o en el código de inicialización del monitor, es error de
compilación. La teoría está en [Variables condición](/monitores/variables-condicion).
