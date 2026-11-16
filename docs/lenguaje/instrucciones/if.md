# `if`

Ejecuta una sentencia o un bloque según una condición.

## Sintaxis

```c
if (cond) sentencia
if (cond) sentencia else sentencia
if (cond) { ... } else { ... }
if (x == 0) x = 1; else if (x == 1) x = 2;
```

Las llaves son opcionales cuando la rama tiene una sola sentencia.

## Funcionamiento

La condición tiene que ser `bool`. Su evaluación no ocupa un paso propio: se resuelve junto
con la primera sentencia de la rama elegida.

Dentro de un monitor, la espera por una condición no se escribe con `if` sino con
[`while`](./while): con *signal and continue*, la condición puede dejar de cumplirse entre
el `signal` y el momento en que el proceso despertado vuelve a entrar. Un `if` solo es
correcto cuando quien despierta deja la condición asegurada para el despertado, como en la
técnica de pasaje de la condición ([Variables condición](/ejecucion/variables-condicion)).

## Errores

| Situación | Mensaje |
|---|---|
| Condición no booleana | `La condición del if tiene que ser bool y es int` |
| Falta el paréntesis | `Se esperaba '(' después de 'if' (se encontró 'x')` |
| Falta `;` antes de `else` | `Se esperaba ';' (se encontró 'else')` |

## Ejemplo

```c
procedure Pasar() {
  if (not libre) {
    esperando++;
    wait(cola);
  } else libre = false;
}
```
