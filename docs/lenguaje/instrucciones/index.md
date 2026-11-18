# Instrucciones

Cada sentencia ocupa un paso del proceso que la ejecuta. Las guardas de `if`, `while` y
`for` y los bloques no ocupan un paso propio: se resuelven junto con la sentencia siguiente
([Instantes y turnos](/ejecucion/instantes-y-turnos)).

| Instrucción | Formas aceptadas | Dónde |
|---|---|---|
| [Declaración](/lenguaje/tipos#declaraciones) | `int x;` · `int x = 0;` · `int a[3];` · `int a[3] = ([3] 0);` · `Cola c(int);` · `ColaOrdenada f(int, int) desc;` · `text lista, comp;` | Monitor, procedure, proceso |
| [Asignación](./asignacion) | `x = expr;` · `a[i] = expr;` · `x++;` · `x--;` | Todas |
| [Intercambio](./intercambio) | `x :=: y;` · `a[i] :=: a[j];` | Todas |
| [Llamada a monitor](./llamada) | `M.op();` · `M.op(a, b);` · `Escritorio[i].op(a);` | Procedure, proceso |
| [`if`](./if) | `if (e) S` · `if (e) S else S` (el `;` antes del `else` es opcional) | Todas |
| [`while`](./while) | `while (e) S` | Todas |
| [`for`](./for) | Cinco formas | Todas |
| [`skip`](./skip) | `skip;` | Todas |
| [`wait`](./wait) | `wait(cv);` · `wait(cv[i]);` | Procedure |
| [`signal`](./signal) | `signal(cv);` · `signal(cv[i]);` | Procedure |
| [`signal_all`](./signal-all) | `signal_all(cv);` · `signal_all(cv[i]);` | Procedure |
| [`push`](./push) | `push(c, e);` · `push(c, e1, e2);` · `push(c, (e1, e2));` | Todas |
| [`pop`](./pop) | `pop(c, x);` · `pop(c, x, y);` · `pop(c, (x, y));` | Todas |
| [`empty`](./empty) | `empty c` · `empty(c)` (expresión) | Todas |
| [`write`](./write) | `write(e);` · `write(e1, e2, ...);` | Todas |
| [`delay`](./delay) | `delay(instantes);` | Procedure, proceso |
| Bloque | `{ ... }` | Todas |

En la tabla, «Todas» comprende el código de inicialización del monitor, los procedures y
los procesos. Las variables condición se declaran solo en el monitor; las colas, en el
monitor o como locales de un proceso o de un procedure.
