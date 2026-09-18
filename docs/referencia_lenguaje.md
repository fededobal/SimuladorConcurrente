# Referencia del lenguaje — qué se puede escribir en el simulador

Lista completa de palabras reservadas, instrucciones y expresiones que acepta el núcleo
(lexer + parser + validador semántico + VM). Cada forma de esta página fue **probada contra
el backend**: 94 casos de sintaxis y 38 de semántica en ejecución.

Para la teoría de monitores ver [`monitores.md`](monitores.md); para la gramática formal en
EBNF, [`sintaxis_especificacion.md`](sintaxis_especificacion.md).

---

## 1. Palabras reservadas

Son **28**. Ninguna puede usarse como nombre de variable, monitor, procedure o proceso
(escribir `int out = 0;` es error de sintaxis).

| Grupo | Palabras |
|---|---|
| Declaraciones | `monitor` `procedure` `cond` `process` |
| Tipos | `int` `double` `boolean` `text` `Cola` |
| Modos de parámetro | `in` `out` `inout` |
| Control | `if` `else` `while` `for` `skip` |
| Sincronización | `wait` `signal` `signal_all` |
| Colas | `push` `pop` `empty` |
| Operadores lógicos | `and` `or` `not` |
| Literales | `true` `false` |

`sem` y `await` están **reservadas como rechazadas**: si aparecen, el compilador avisa que
pertenecen a la versión de semáforos y no existen acá.

### Símbolos

| | |
|---|---|
| Aritméticos | `+` `-` `*` `/` `%` |
| Comparación | `==` `!=` `<` `<=` `>` `>=` |
| Lógicos (alias) | `&&` `\|\|` `!` |
| Asignación | `=` `++` `--` |
| Agrupación | `(` `)` `{` `}` `[` `]` |
| Separadores | `;` `,` `:` `.` |
| Rango | `..` |

### Comentarios

```c
// de línea
/* de bloque,
   puede ocupar varias líneas */
int /* también entre tokens */ x = 1;
```

Un `/*` sin cerrar es error de compilación. Un `//` adentro de una cadena
(`text s = "http://x";`) **no** abre un comentario.

---

## 2. Estructura del programa

Tres clases de declaraciones de nivel superior, en cualquier orden, y **al menos un
proceso**:

```c
int N = 5;                    // 1. constantes globales (solo lectura)

monitor Recurso { ... }       // 2. monitores

process Cliente[i: 1..N] { }  // 3. procesos
```

Todo el estado compartido **mutable** vive dentro de un monitor. No hay variables globales
que se puedan asignar.

### Constantes globales

```c
int N = 5;
double TASA = 0.75;
boolean DEBUG = true;
text TITULO = "buffer";
int M;              // sin valor: queda en el default del tipo
int TOTAL = 2 + 3;  // el valor puede ser una expresión
```

No pueden ser arreglos ni `Cola`. Asignarles algo después es error.

---

## 3. Tipos y valores

| Tipo | Literales | Valor inicial |
|---|---|---|
| `int` | `0`, `42` | `0` |
| `double` | `3.14`, `0.5` | `0.0` |
| `boolean` | `true`, `false` | `false` |
| `text` | `"hola"` | `""` |
| `Cola` | — se llena con `push` | vacía |

- `7 / 2` da `3` (ambos `int`); `7.0 / 2` da `3.5`. `%` solo tiene sentido entre enteros.
- `+` con un `text` de un lado concatena: `"n=" + 5` → `"n=5"`.
- `1 == 1.0` es `true`.

### Arreglos

```c
int a[3];                 // los 3 en 0
int b[3] = ([3] 0);       // forma explícita de la cátedra
int c[N];                 // el tamaño puede ser una constante global
```

Índice base 0: `a[0]`, `a[(i + 1) % N]`. Un índice fuera de rango es error de ejecución
(`Indice 5 fuera de rango para 'a' (tamano 2)`).

Se declaran dentro de un monitor o como locales de un proceso — **no** como constante global.

### Cola (FIFO)

```c
Cola c;
push(c, 1);          // encola un elemento
push(c, 7, 9);       // encola UNA tupla de dos componentes
pop(c, x);           // desencola el frente
pop(c, a, b);        // desestructura la tupla: a=7, b=9
boolean v = empty c; // sin paréntesis
```

La cantidad de destinos del `pop` tiene que coincidir con la de la tupla encolada:
`push(c, 1, 2)` seguido de `pop(c, x)` es error de ejecución. `pop` sobre cola vacía también.

`empty` se escribe **sin paréntesis**: `empty c`, no `empty(c)`.

---

## 4. Monitores

```c
monitor Nombre {
    <variables permanentes>
    <variables condición>
    <sentencias de inicialización>   // opcional, corren una vez al arrancar
    <procedures>
}
```

El orden de los miembros es libre. Las permanentes y las `cond` solo se ven adentro del
monitor. Las sentencias sueltas en el cuerpo son el código de inicialización y **no pueden**
llamar a otro monitor ni usar `wait`/`signal`.

### Variables condición

```c
cond libre;
cond libre, ocupado;   // varias en una línea
cond turno[N];         // arreglo de condiciones (condiciones privadas)
```

Si la `cond` es un arreglo hay que indexarla siempre: `wait(turno[i])`, `signal(turno[i])`.

### Procedures

```c
procedure depositar(d: in int) { ... }
procedure retirar(r: out int) { ... }
procedure ajustar(v: inout double) { ... }
procedure mirar(x: int) { ... }          // sin modo = in
procedure nada() { ... }
```

- **`in`** (default): solo lectura, asignarle adentro es error.
- **`out`**: se copia al argumento del llamador al retornar.
- **`inout`**: entra y sale.
- El argumento de un `out`/`inout` tiene que ser una variable o un elemento de arreglo
  asignable — `M.dar(3)` es error.
- Los parámetros son **escalares**: no se pasan arreglos ni `Cola`.
- No hay valor de retorno; los resultados salen por `out`/`inout`.

### Operaciones de condición

Solo dentro de un procedure (es decir, con el monitor tomado):

```c
wait(cv);        // siempre demora; libera el monitor
signal(cv);      // despierta al primero de cv; si está vacía no hace nada
signal_all(cv);  // despierta a todos los de cv
```

Disciplina **signal and continue**: el que señaliza sigue con el monitor tomado y el
despertado pasa a competir en la cola de entrada. Por eso la condición normalmente se
re-testea con `while`, no con `if`.

---

## 5. Procesos

```c
process Productor {
    ...
}

process Cliente[i: 1..5] {   // familia: instancia Cliente[1] .. Cliente[5]
    ...
}
```

- `desde` y `hasta` pueden ser constantes globales: `process P[i: 0..N]`.
- El iterador es de **solo lectura** dentro del cuerpo.
- Si `desde > hasta` no se instancia ningún proceso.
- En el cuerpo se ven: las locales del proceso, el iterador y las constantes globales. Los
  nombres de monitor solo aparecen en llamadas.

---

## 6. Instrucciones

| Instrucción | Formas aceptadas |
|---|---|
| Declaración | `int x;` · `int x = 0;` · `int a[3];` · `int a[3] = ([3] 0);` · `Cola c;` |
| Asignación | `x = expr;` · `a[i] = expr;` |
| Incremento | `x++;` · `x--;` · `a[i]++;` · `a[i]--;` |
| Llamada a monitor | `Monitor.procedure();` · `Monitor.procedure(a, b);` |
| Condición | `wait(cv);` · `signal(cv);` · `signal_all(cv);` · con índice: `wait(cv[i]);` |
| Cola | `push(c, e);` · `push(c, e1, e2);` · `pop(c, x);` · `pop(c, x, y);` |
| Condicional | `if (e) S` · `if (e) S else S` · con o sin llaves |
| Mientras | `while (e) S` · con o sin llaves |
| For | ver abajo |
| Bloque | `{ ... }` suelto |
| Nada | `skip;` |

Cada sentencia (y cada evaluación de guarda, y cada llamada a monitor) es **un paso atómico**
del scheduler: en cada instante avanza un solo proceso, una sola sentencia.

### `if` / `while`

Las llaves son opcionales cuando el cuerpo es una sola sentencia:

```c
if (x == 0) x = 1;
if (x == 0) x = 1; else x = 2;
if (x == 0) { x = 1; } else { x = 2; }
while (hay) wait(libre);
while (i < 3) { s = s + i; i++; }
```

### `for`

Cuatro formas, todas válidas:

```c
for (int i = 0; i < N; i++) { ... }    // declara el iterador
for (i = 0; i < N; i++) { ... }        // reusa una variable existente
for (int i = 1..N) { ... }             // rango, inclusivo en ambos extremos
for (i = 1..N) { ... }                 // rango con variable existente
```

El paso puede ser `i++`, `i--` o `i = expr`:

```c
for (int i = 0; i < 6; i = i + 2) { ... }
for (int i = 3; i > 0; i--) { ... }
```

La condición puede omitirse (`for (int i = 0; ; i++)`) pero **no hay `break`**, así que eso
es un ciclo infinito.

---

## 7. Expresiones

| Nivel | Operadores | Asociatividad |
|---|---|---|
| 1 (menor) | `or` `\|\|` | izquierda |
| 2 | `and` `&&` | izquierda |
| 3 | `not` `!` | prefijo |
| 4 | `==` `!=` `<` `<=` `>` `>=` | **no asociativo** |
| 5 | `+` `-` | izquierda |
| 6 | `*` `/` `%` | izquierda |
| 7 (mayor) | `-` unario | prefijo |

Primarios: un número, una cadena, `true`, `false`, `empty cola`, una variable, un elemento de
arreglo (`a[i]`) o una expresión entre paréntesis.

`and` y `or` evalúan en **corto circuito**: en `false and 1/0 == 0` la división nunca se
ejecuta.

La comparación **no encadena**: `1 < 2 < 3` es error de sintaxis. Hay que escribir
`1 < 2 and 2 < 3`.

---

## 8. Alcance de los nombres

| Dónde estás | Qué ves |
|---|---|
| Cuerpo de un `process` | sus locales, el iterador de la familia, las constantes globales |
| Cuerpo de un `procedure` | sus parámetros, sus locales, las permanentes y `cond` del monitor, las constantes globales |
| Inicialización del monitor | las permanentes del monitor y las constantes globales |

Lo importante: **las variables locales de un proceso no se ven adentro de un monitor**. Si un
procedure necesita un dato del proceso, entra por parámetro; si tiene que devolver algo, sale
por un `out`.

No se puede asignar a: una constante global, un parámetro `in`, ni el iterador de una familia.

---

## 9. Qué avisa el compilador

Errores de compilación (con número de línea), verificados:

- `Monitor no declarado: X` · `El monitor M no tiene un procedure 'q'`
- `La llamada a M.p espera 1 argumento(s) y recibio 0`
- `El argumento para el parametro 'x' (out) debe ser una variable o un elemento de arreglo`
- `Nombre no declarado en este alcance: y`
- `No se puede asignar a 'N' (es constante, parametro in o iterador)`
- `Variable condicion no declarada: c` · `La cond 'c' es un arreglo: falta el indice`
- `wait/signal/signal_all solo pueden usarse dentro de un procedure de monitor`
- `El codigo de inicializacion del monitor M no puede llamar a monitores ni usar wait/signal`
- `Las constantes globales no pueden ser arreglos`
- `El programa debe tener al menos un proceso`
- `Nombre global duplicado: N` · `Procedure duplicado 'p' en el monitor M`
- `Comentario de bloque sin cerrar` · `Cadena de texto sin cerrar`
- `'sem' pertenece a la version de semaforos y no se soporta...`

Errores de ejecución (terminan ese proceso): índice fuera de rango, división o módulo por
cero, `pop` sobre cola vacía, tupla desencolada con menos componentes que destinos.

Si ningún proceso queda listo y no todos terminaron, el simulador reporta **deadlock**.

---

## 10. Qué no existe

Fuera del alcance de esta versión, a propósito:

- Semáforos: `sem`, `P`, `V`. Bloque atómico `< >`. `await`.
- `signal and wait`, `signal` con prioridad, `minrank`, `empty(cv)` sobre una condición.
- `break`, `continue`, `return`.
- Funciones o procedures fuera de un monitor; recursión.
- Variables globales mutables.
- Arreglos o `Cola` como parámetro de un procedure.
- Arreglos multidimensionales.
- Pasaje de mensajes, `send`/`receive`.

---

## 11. Ejemplo que usa casi todo

```c
int N = 3;

monitor Asignador {
  int libres = N;
  boolean tomado[3] = ([3] false);
  int otorgados = 0;
  cond hayLibre;

  procedure pedir(id: out int) {
    while (libres == 0) wait(hayLibre);
    libres = libres - 1;
    for (int i = 0..2) {
      if (not tomado[i] and id == 0) {
        tomado[i] = true;
        id = i + 1;
      }
    }
    otorgados++;
  }

  procedure devolver(id: in int) {
    tomado[id - 1] = false;
    libres = libres + 1;
    signal(hayLibre);
  }
}

process Cliente[c: 1..5] {
  int mio = 0;
  Asignador.pedir(mio);   // 'mio' vuelve escrito por el parámetro out
  Asignador.devolver(mio);
}
```
