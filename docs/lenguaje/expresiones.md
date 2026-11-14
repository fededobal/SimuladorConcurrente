# Expresiones

| Nivel | Operadores | Asociatividad |
|---|---|---|
| 1 (menor) | `or` `\|\|` | Izquierda |
| 2 | `and` `&&` | Izquierda |
| 3 | `not` `!` | Prefijo |
| 4 | `==` `!=` `<` `<=` `>` `>=` | No asociativo |
| 5 | `+` `-` | Izquierda |
| 6 | `*` `/` `mod` | Izquierda |
| 7 (mayor) | `-` unario | Prefijo |

Primarios: un número, una cadena, `true`, `false`, `empty cola` (o `empty(cola)`), una
variable, un elemento de arreglo (`a[i]`) o una expresión entre paréntesis.

Tipos de las operaciones:

- `+ - * /` entre números: `int` si los dos son `int`, si no `double`. `/` entre dos `int`
  es la división entera (`7 / 2` da `3`).
- `mod` entre dos `int` es el resto entero; con algún `double`, el resto real
  (`5.5 mod 2` da `1.5`).
- `+` con un `text` concatena: `"total: " + 3` da `"total: 3"`.
- `==` y `!=` comparan dos números o dos valores del mismo tipo; `< <= > >=`, dos números o
  dos `text` (orden alfabético). Comparar un `text` con un número es error de compilación.
  Dos `int` se comparan exactos, sin redondeo.
- `and`, `or` y `not` se aplican a `bool`.

Una expresión puede anidar hasta 100 niveles de paréntesis y encadenar hasta 200
operaciones; más que eso es error de compilación (lo mismo vale para bloques anidados).

`and` y `or` evalúan en corto circuito: en `false and 1/0 == 0` la división nunca se
ejecuta.

La comparación no encadena: `1 < 2 < 3` es error de compilación ("Las comparaciones no se
encadenan"). Hay que escribir `1 < 2 and 2 < 3`.
