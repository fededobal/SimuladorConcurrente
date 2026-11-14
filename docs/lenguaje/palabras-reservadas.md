# Palabras reservadas y símbolos

Son 31. Ninguna puede usarse como nombre de variable, monitor, procedure o proceso
(escribir `int out = 0;` es error de sintaxis). `monitor`, `procedure` y `process` se
aceptan con cualquier combinación de mayúsculas (`Monitor`, `Procedure`, `PROCESS`), como
las escribe la cátedra; el resto se escribe tal cual figura en la tabla.

| Grupo | Palabras |
|---|---|
| Declaraciones | `monitor` `procedure` `cond` `process` |
| Tipos | `int` `double` `bool` `text` `Cola` `ColaOrdenada` |
| Modos de parámetro | `in` `out` |
| Control | `if` `else` `while` `for` `skip` |
| Sincronización | `wait` `signal` `signal_all` |
| Colas | `push` `pop` `empty` |
| Salida | `write` |
| Tiempo | `delay` |
| Operadores | `and` `or` `not` `mod` |
| Literales | `true` `false` |

No hay rastro de semáforos: `sem`, `await`, `p` y `v` no son palabras reservadas, son
identificadores comunes y se pueden usar como nombre de variable.

`boolean` y el símbolo `%` no existen: el compilador indica que se escriben `bool` y `mod`.

## Símbolos

| | |
|---|---|
| Aritméticos | `+` `-` `*` `/` (el resto es la palabra `mod`) |
| Comparación | `==` `!=` `<` `<=` `>` `>=` |
| Lógicos (alias) | `&&` `\|\|` `!` |
| Asignación | `=` `++` `--` |
| Agrupación | `(` `)` `{` `}` `[` `]` |
| Separadores | `;` `,` `:` `.` |
| Rango | `..` |
