# `for`

Cinco formas, todas válidas: las de C y las de la cátedra.

```c
for (int i = 0; i < n; i++) { ... }    // estilo C, declara el iterador
for (i = 0; i < n; i++) { ... }        // estilo C, reusa una variable existente
for (int i = 1..n) { ... }             // rango, inclusivo en ambos extremos
for (i = 1..n) { ... }                 // rango con variable existente
for (1..n) { ... }                     // rango sin iterador: solo repite
```

| Regla | Detalle |
|---|---|
| `int i` declara el iterador | no vale si ya existe una variable `i` visible ([alcance](../alcance)); entonces va la forma que la reusa |
| `for (1..n)` | el iterador no tiene nombre: solo importa cuántas veces repetir |
| rango | el iterador es `int` y la cota se calcula una sola vez, al entrar |
| el iterador no se asigna | lo cambia solo el paso del `for`; asignarlo en el cuerpo es error de compilación |

El paso puede ser `i++`, `i--` o `i = expr`:

```c
for (int i = 0; i < 6; i = i + 2) { ... }
for (int i = 3; i > 0; i--) { ... }
```

La condición puede omitirse (`for (int i = 0; ; i++)`) pero no hay `break`, así que eso es
un ciclo infinito.
