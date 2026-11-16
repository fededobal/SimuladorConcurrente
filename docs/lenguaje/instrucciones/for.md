# `for`

Repite un bloque con un iterador o una cantidad fija de veces.

## Sintaxis

```c
for (int i = 0; i < n; i++) { ... }    // estilo C, declara el iterador
for (i = 0; i < n; i++) { ... }        // estilo C, usa una variable existente
for (int i = 1..n) { ... }             // rango, incluye los dos extremos
for (i = 1..n) { ... }                 // rango con una variable existente
for (1..n) { ... }                     // rango sin iterador: solo repite
```

El paso de la forma C puede ser `i++`, `i--` o `i = expr`:

```c
for (int i = 0; i < 6; i = i + 2) { ... }
for (int i = 3; i > 0; i--) { ... }
```

## Funcionamiento

En la forma de rango, el iterador es `int` y la cota se calcula una sola vez, al entrar.
El iterador no se puede modificar en el cuerpo: lo cambia solo el paso del `for`. La
condición de la forma C puede omitirse (`for (int i = 0; ; i++)`), lo que produce un ciclo
infinito, porque no existe `break`.

`int i` declara un iterador nuevo; si ya existe una variable `i` visible, se usa la forma
sin tipo ([Alcance de los nombres](/lenguaje/alcance)).

## Errores

| Situación | Mensaje |
|---|---|
| Condición no booleana | `La condición del for tiene que ser bool y es int` |
| Cota no entera | `La cota del for tiene que ser int y es double` |
| Asignar el iterador en el cuerpo | `No se puede modificar el iterador 'i' dentro del for: lo cambia solo el paso del for` |
| Iterador ya declarado | `Ya existe una variable local llamada 'i': elegí otro nombre para no taparla` |
| Paso no válido | `Se esperaba '++', '--' o '=' en el paso del 'for' (se encontró '*')` |

## Ejemplo

```c
process Productor {
  for (int i = 1..5) {
    Buffer.depositar(i);
  }
}
```
