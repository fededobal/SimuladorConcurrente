# Tipos, conversiones y arreglos

| Tipo | Valores | Por defecto |
|---|---|---|
| `int` | Enteros de 64 bits | `0` |
| `double` | Números con decimales | `0.0` |
| `bool` | `true`, `false` | `false` |
| `text` | Cadenas entre comillas dobles | `""` |

Las colas, `Cola` y `ColaOrdenada`, se describen en su [propia página](./colas).

El compilador controla los tipos: una condición (`if`, `while`, `for`) tiene que ser
`bool`; un índice, un tamaño o una cota de familia, `int`; y lo que se guarda en una
variable, se pasa como argumento o se devuelve por un `out` tiene que coincidir con el tipo
del destino. Las únicas conversiones automáticas son:

- un `int` donde va un `double` (`double d = 3;` guarda `3.0`);
- un número donde va un `text` (`text t = 5;` guarda `"5"`).

`int x = 2.9;` es error de compilación: no se trunca en silencio. Un `bool` no es un
número (`int x = true;` es error).

Las cadenas no tienen secuencias de escape: `\` es un carácter común y una comilla doble
no puede ir dentro de un texto.

Un número muy grande en el programa es error de compilación, y un resultado que no entra en
un `int` (desborde) o un `double` infinito o indefinido (por ejemplo, multiplicar números
enormes) son errores de ejecución. Los `double` se muestran con decimales (`3.0`, `0.5`) y,
desde 9 007 199 254 740 992 en adelante, en notación científica (`1.0E20`).

## Declaraciones

```monitores
int x;                    // vale 0
int x = 0;
text lista, comp;         // varias del mismo tipo
int i = 0, j;             // el valor inicial es solo del nombre que lo lleva
```

En una declaración con varios nombres, el valor inicial es solo del nombre que lo lleva:
`int i = 0, j;` deja `j` en `0` por ser el valor por defecto, no por el `= 0` de `i`.

## Arreglos

```monitores
int a[3];                 // los 3 en 0
int b[3] = ([3] 0);       // forma explícita de la cátedra
int c[n];                 // el tamaño es una expresión int
text res[N];              // o una constante del programa (#define N 5)
```

Índice base 0: `a[0]`, `a[(i + 1) mod 3]`. Un índice fuera de rango es error de ejecución
(`Índice 5 fuera de rango para 'a' (tamaño 2)`). El tamaño va de 0 a 100 000 elementos.

Se declaran dentro de un monitor o como locales de un proceso. Un arreglo se usa siempre
elemento por elemento: `a = 5`, `a = b` o pasar `a` como argumento son errores de
compilación. La excepción es `write(a)`, que muestra el arreglo entero.
