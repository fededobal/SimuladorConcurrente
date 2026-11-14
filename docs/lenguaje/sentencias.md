# Sentencias

| Instrucción | Formas aceptadas |
|---|---|
| Declaración | `int x;` · `int x = 0;` · `int a[3];` · `int a[3] = ([3] 0);` · `Cola c(int);` · `ColaOrdenada g(int, text, text);` · `ColaOrdenada g(int, (text, text));` · varias del mismo tipo: `text lista, comp;` · `int i = 0, j;` |
| Asignación | `x = expr;` · `a[i] = expr;` |
| Incremento | `x++;` · `x--;` · `a[i]++;` · `a[i]--;` |
| Llamada a monitor | `Monitor.procedure();` · `Monitor.procedure(a, b);` · `Escritorio[i].procedure(a);` |
| Condición | `wait(cv);` · `signal(cv);` · `signal_all(cv);` · con índice: `wait(cv[i]);` |
| Cola | `push(c, e);` · `push(c, e1, e2);` · `push(c, (e1, e2));` · `push(c, (e1, (e2, e3)));` · `pop(c, x);` · `pop(c, x, y);` · `pop(c, (x, y));` · `pop(c, (x, (y, z)));` |
| Salida | `write(e);` · `write(e1, e2, ...);` |
| Condicional | `if (e) S` · `if (e) S else S` · con o sin llaves |
| Mientras | `while (e) S` · con o sin llaves |
| For | Cinco formas, ver [`for`](./instrucciones/for) |
| Bloque | `{ ... }` suelto |
| Nada | `skip;` |
| Demora | `delay(segundos);` |

Cada una tiene su página: [`if` y `while`](./instrucciones/if-while),
[`for`](./instrucciones/for), [`wait`, `signal` y `signal_all`](./instrucciones/wait-signal),
[`push`, `pop` y `empty`](./instrucciones/push-pop), [`write`](./instrucciones/write) y
[`delay`](./instrucciones/delay).

`skip` no hace nada, pero ocupa un paso del planificador como cualquier otra sentencia:
sirve para que un proceso "gaste" un instante o como cuerpo vacío de un ciclo.
