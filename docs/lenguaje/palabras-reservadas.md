# Palabras reservadas y símbolos

Son 31. Se aceptan con cualquier combinación de mayúsculas (`Monitor`, `OR`, `OUT`,
`colaOrdenada`), como aparecen en el material de la cátedra. Ninguna puede usarse como
nombre de variable, monitor, procedure o proceso, en ninguna combinación de mayúsculas
(`int out = 0;` e `int Out = 0;` son errores de sintaxis).

Los nombres que declara el programa sí distinguen mayúsculas: si se declara `process P`,
`p` es otro nombre.

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
