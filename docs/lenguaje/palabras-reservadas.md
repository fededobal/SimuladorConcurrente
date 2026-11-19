# Palabras reservadas y símbolos

Son 34. Se aceptan con cualquier combinación de mayúsculas (`Monitor`, `OR`, `OUT`,
`colaOrdenada`), como aparecen en el material de la cátedra. No pueden usarse como nombre de
variable, monitor, procedure o proceso, en ninguna combinación de mayúsculas (`int out = 0;`
e `int Out = 0;` son errores de sintaxis). La única excepción es `cola`.

## `cola` como nombre

La cátedra usa `cola` como tipo (`cola elibres;`) y también como nombre de una variable
condición (`cond cola;`, en el ejercicio 2 de la Explicación 3). El simulador acepta las dos
formas, que no se confunden: la palabra es el tipo cuando va seguida del nombre que declara
(`Cola fila(int);`), y es un nombre en cualquier otro lugar (`cond cola;`, `wait(cola);`,
`signal(cola);`). `ColaOrdenada` sí es reservada siempre.

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
| Orden de una `ColaOrdenada` | `asc` `desc` |
| Salida | `write` |
| Tiempo | `delay` |
| Azar | `random` |
| Operadores | `and` `or` `not` `mod` |
| Literales | `true` `false` |

No hay palabras reservadas de semáforos: `sem`, `await`, `p` y `v` son
identificadores comunes y se pueden usar como nombre de variable.

`boolean` y el símbolo `%` no existen: el compilador indica que se escriben `bool` y `mod`.

## Símbolos

| | |
|---|---|
| Aritméticos | `+` `-` `*` `/` (el resto es la palabra `mod`) |
| Comparación | `==` `!=` `<` `<=` `>` `>=` |
| Lógicos (alias) | `&&` `\|\|` `!` |
| Asignación | `=` `++` `--` `:=:` (intercambio) |
| Agrupación | `(` `)` `{` `}` `[` `]` |
| Separadores | `;` `,` `:` `.` |
| Directiva | `#define` ([Constantes](./constantes)) |
| Rango | `..` |
