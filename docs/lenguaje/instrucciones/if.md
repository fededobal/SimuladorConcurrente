# `if`

Ejecuta una sentencia o un bloque según una condición.

## Sintaxis

```monitores
if (cond) sentencia
if (cond) sentencia else sentencia
if (cond) { ... } else { ... }
if (x == 0) x = 1; else if (x == 1) x = 2;
if (s == 0) wait(pos) else s = s - 1;      // sin ';' antes del else
```

Las llaves son opcionales cuando la rama tiene una sola sentencia. En ese caso, como en los
programas de la cátedra, el `;` de esa sentencia puede omitirse si a continuación viene el
`else`. Dentro de un bloque entre llaves, cada sentencia lleva su `;`.

## Funcionamiento

La condición tiene que ser `bool`. Su evaluación no ocupa un paso propio: se resuelve junto
con la primera sentencia de la rama elegida.

Dentro de un monitor, la espera por una condición se puede escribir con `if` o con
[`while`](./while). Con `if`, el proceso despertado sigue sin volver a chequear la condición;
con *signal and continue*, esa condición puede haber dejado de cumplirse entre el `signal` y
el momento en que el despertado vuelve a entrar, y entonces el programa falla. El `if` es
correcto cuando nadie puede adelantarse al despertado, o cuando quien despierta le deja la
condición asegurada, como en la técnica *passing the condition*
([Variables condición](/ejecucion/variables-condicion)). El ejemplo **Espera con if: un
semáforo que falla** permite comprobarlo.

## Errores

| Situación | Mensaje |
|---|---|
| Condición no booleana | `La condición del if tiene que ser bool y es int` |
| Falta el paréntesis | `Se esperaba '(' después de 'if' (se encontró 'x')` |
| Falta `;` y no sigue un `else` | `Se esperaba ';' (se encontró 'x')` |

## Ejemplo

```monitores
procedure Pasar() {
  if (not libre) {
    esperando++;
    wait(cola);
  } else libre = false;
}
```
