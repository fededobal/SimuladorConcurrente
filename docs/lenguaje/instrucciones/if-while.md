# `if` y `while`

Las llaves son opcionales cuando el cuerpo es una sola sentencia:

```c
if (x == 0) x = 1;
if (x == 0) x = 1; else x = 2;
if (x == 0) { x = 1; } else { x = 2; }
while (hay) wait(libre);
while (i < 3) { s = s + i; i++; }
```

La condición tiene que ser `bool`: `if (x)` con `x` entero es error de compilación.

La evaluación de la guarda no ocupa un paso propio del planificador: se resuelve junto con
la primera sentencia del cuerpo (o con la que sigue al `if`, si la condición es falsa).

En un monitor, la condición de espera se escribe con `while` y no con `if`: con la
disciplina *signal and continue*, entre el `signal` y el momento en que el proceso
despertado vuelve a entrar, otro proceso pudo cambiar el estado. Ver
[Variables condición](/monitores/variables-condicion).
