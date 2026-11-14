# `for`

Cinco formas, todas válidas: las de C y las de la cátedra.

```c
for (int i = 0; i < n; i++) { ... }    // estilo C, declara el iterador
for (i = 0; i < n; i++) { ... }        // estilo C, reusa una variable existente
for (int i = 1..n) { ... }             // rango, inclusivo en ambos extremos
for (i = 1..n) { ... }                 // rango con variable existente
for (1..n) { ... }                     // rango sin iterador: solo repite
```

Las formas que declaran el iterador (`int i`) no se pueden usar si ya existe una variable
`i` visible (ver [Alcance](../alcance)): en ese caso va la forma que la reusa.

En `for (1..n)` el iterador existe pero no tiene nombre, así que el cuerpo no puede leerlo:
se usa cuando solo importa cuántas veces repetir.

En las formas de rango, el iterador es `int` y la cota se calcula una sola vez, al entrar:
si el cuerpo cambia `n`, el `for` da igual la cantidad de vueltas que tenía al empezar. En
todas las formas, el iterador solo lo cambia el paso del `for`: asignarlo dentro del cuerpo
es error de compilación.

El paso puede ser `i++`, `i--` o `i = expr`:

```c
for (int i = 0; i < 6; i = i + 2) { ... }
for (int i = 3; i > 0; i--) { ... }
```

La condición puede omitirse (`for (int i = 0; ; i++)`) pero no hay `break`, así que eso es
un ciclo infinito.
