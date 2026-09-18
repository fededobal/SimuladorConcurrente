# Referencia del lenguaje — qué se puede escribir en el simulador

Lista completa de palabras reservadas, instrucciones y expresiones que acepta el núcleo
(lexer + parser + validador semántico + VM). Cada forma de esta página fue **probada contra
el backend**: 94 casos de sintaxis y 38 de semántica en ejecución.

Para la teoría de monitores ver [`monitores.md`](monitores.md); para la gramática formal en
EBNF, [`sintaxis_especificacion.md`](sintaxis_especificacion.md).

---

## 1. Palabras reservadas

Son **29**. Ninguna puede usarse como nombre de variable, monitor, procedure o proceso
(escribir `int out = 0;` es error de sintaxis).

| Grupo | Palabras |
|---|---|
| Declaraciones | `monitor` `procedure` `cond` `process` |
| Tipos | `int` `double` `boolean` `text` `Cola` `ColaOrdenada` |
| Modos de parámetro | `in` `out` |
| Control | `if` `else` `while` `for` `skip` |
| Sincronización | `wait` `signal` `signal_all` |
| Colas | `push` `pop` `empty` |
| Salida | `write` |
| Operadores lógicos | `and` `or` `not` |
| Literales | `true` `false` |

No hay rastro de semáforos: `sem`, `await`, `p` y `v` **no son palabras reservadas**, son
identificadores comunes y se pueden usar como nombre de variable.

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

Dos clases de declaraciones de nivel superior, en cualquier orden, y **al menos un
proceso**:

```c
monitor Recurso { ... }       // 1. monitores

process Cliente[i: 1..5] { }  // 2. procesos
```

**No hay variables globales**, de ningún tipo: toda variable vive dentro de un monitor
(permanente, compartida) o dentro de un proceso (local, privada). Es la regla central del
modelo: el estado compartido solo se toca con la exclusión mutua del monitor.

### Arreglos

```c
int a[3];                 // los 3 en 0
int b[3] = ([3] 0);       // forma explícita de la cátedra
int c[3];                 // el tamaño es una expresión constante
```

Índice base 0: `a[0]`, `a[(i + 1) % 3]`. Un índice fuera de rango es error de ejecución
(`Indice 5 fuera de rango para 'a' (tamano 2)`).

Se declaran dentro de un monitor o como locales de un proceso.

### Cola (FIFO)

```c
Cola c;
push(c, 1);          // encola un elemento
push(c, 7, 9);       // encola UNA tupla de dos componentes
pop(c, x);           // desencola el frente
pop(c, a, b);        // desestructura la tupla: a=7, b=9
boolean v = empty c; // sin paréntesis
```

Cada cola maneja **una cantidad fija de componentes**, que queda fijada por su primer
`push`/`pop`. Como una cola no puede ser parámetro ni elemento de arreglo, todos sus usos son
visibles al compilar, así que la inconsistencia se detecta **antes de correr**:

```
Linea 5: La cola 'c' maneja 2 componente(s) (fijado en la linea 4) y este pop usa 1
```

`pop` sobre cola vacía sí es error de ejecución.

`empty` se escribe **sin paréntesis**: `empty c`, no `empty(c)`.

### ColaOrdenada (cola de prioridad)

Mismas operaciones que `Cola` — `push`, `pop`, `empty` — pero el `push` **inserta ordenado
por la primera componente** en vez de al final:

```c
ColaOrdenada c;
push(c, 3, "tercero");
push(c, 1, "primero");
push(c, 2, "segundo");
pop(c, p, d);          // p=1, d="primero"
```

- Ordena por la **primera** componente (`x` en `push(c, x, y, z)`). Las demás viajan con
  ella como un registro y salen por los destinos restantes del `pop`.
- A **igual clave, sale primero el que se encoló antes** (inserción estable, FIFO entre
  iguales). Encolar `(1,"a") (1,"b") (0,"cero") (1,"c")` desencola `cero a b c`.
- Con una sola componente, ordena por el valor: `5 1 4 1 3` sale `1 1 3 4 5`.
- Los números se comparan numéricamente; si alguna clave es `text`, la comparación es
  alfabética.
- `Cola` sigue siendo FIFO pura: el tipo de la variable es lo único que cambia.

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
cond turno[3];         // arreglo de condiciones (condiciones privadas)
```

Si la `cond` es un arreglo hay que indexarla siempre: `wait(turno[i])`, `signal(turno[i])`.

### Procedures

```c
procedure depositar(d: in int) { ... }
procedure retirar(r: out int) { ... }
procedure mirar(x: int) { ... }          // sin modo = in
procedure nada() { ... }
```

- **`in`** (default): solo lectura, asignarle adentro es error.
- **`out`**: se copia al argumento del llamador al retornar.
- El argumento de un `out` tiene que ser una variable o un elemento de arreglo
  asignable — `M.dar(3)` es error.
- Los parámetros son **escalares**: no se pasan arreglos ni `Cola`.
- No hay valor de retorno; los resultados salen por `out`.

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

- El iterador es de **solo lectura** dentro del cuerpo.
- Si `desde > hasta` no se instancia ningún proceso.
- En el cuerpo se ven: las locales del proceso y el iterador. Los nombres de monitor solo
  aparecen en llamadas.

---

## 6. Instrucciones

| Instrucción | Formas aceptadas |
|---|---|
| Declaración | `int x;` · `int x = 0;` · `int a[3];` · `int a[3] = ([3] 0);` · `Cola c;` · `ColaOrdenada c;` |
| Asignación | `x = expr;` · `a[i] = expr;` |
| Incremento | `x++;` · `x--;` · `a[i]++;` · `a[i]--;` |
| Llamada a monitor | `Monitor.procedure();` · `Monitor.procedure(a, b);` |
| Condición | `wait(cv);` · `signal(cv);` · `signal_all(cv);` · con índice: `wait(cv[i]);` |
| Cola | `push(c, e);` · `push(c, e1, e2);` · `pop(c, x);` · `pop(c, x, y);` |
| Salida | `write(e);` · `write(e1, e2, ...);` |
| Condicional | `if (e) S` · `if (e) S else S` · con o sin llaves |
| Mientras | `while (e) S` · con o sin llaves |
| For | ver abajo |
| Bloque | `{ ... }` suelto |
| Nada | `skip;` |

Cada sentencia (y cada evaluación de guarda, y cada llamada a monitor) es **un paso atómico**
del scheduler. En un mismo instante **avanzan varios procesos a la vez**, cada uno una
sentencia: los procesos corren en paralelo, no entrelazados de a uno.

No todos avanzan en cada instante —unos van más rápido que otros, como en la realidad— y el
orden dentro del instante es el que decide **quién gana el monitor** cuando dos lo piden a la
vez. El que pierde queda en la cola de entrada.

Que corran en paralelo no rompe nada: la exclusión mutua del monitor sigue serializando todo
lo que toca estado compartido. Por eso un contador dentro de un monitor da siempre el mismo
total, corran los procesos como corran — que es justamente la garantía que dan los monitores.

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

Cinco formas, todas válidas — las de C y las de la cátedra:

```c
for (int i = 0; i < n; i++) { ... }    // estilo C, declara el iterador
for (i = 0; i < n; i++) { ... }        // estilo C, reusa una variable existente
for (int i = 1..n) { ... }             // rango, inclusivo en ambos extremos
for (i = 1..n) { ... }                 // rango con variable existente
for (1..n) { ... }                     // rango sin iterador: solo repite
```

En `for (1..n)` el iterador existe pero no tiene nombre, así que el cuerpo no puede leerlo:
se usa cuando solo importa **cuántas veces** repetir.

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

### `write`

Escribe una línea en la pantalla de salida, a la derecha del editor:

```c
write("deposite ", i);          // -> deposite 3
write("total: ", a + b, " u");  // -> total: 7 u
```

Los argumentos se concatenan tal cual, sin separador: si querés un espacio, ponelo en el
texto. Cada `write` es **una línea** y **un paso** del scheduler, como cualquier sentencia.

Cada línea queda pintada con el color del proceso que la escribió. Eso es lo que hace útil
la pantalla: como los procesos corren en paralelo, **el orden de la salida cambia entre
corridas**, y verlo es la forma más directa de entender el entrelazado.

`write` se puede usar tanto en un proceso como dentro de un procedure de monitor.

---

## 8. Alcance de los nombres

| Dónde estás | Qué ves |
|---|---|
| Cuerpo de un `process` | sus locales y el iterador de la familia |
| Cuerpo de un `procedure` | sus parámetros, sus locales, las permanentes y `cond` del monitor |
| Inicialización del monitor | las permanentes del monitor |

Lo importante: **las variables locales de un proceso no se ven adentro de un monitor**. Si un
procedure necesita un dato del proceso, entra por parámetro; si tiene que devolver algo, sale
por un `out`.

No se puede asignar a: un parámetro `in` ni el iterador de una familia.

---

## 9. Qué avisa el compilador

Errores de compilación (con número de línea), verificados:

- `Monitor no declarado: X` · `El monitor M no tiene un procedure 'q'`
- `La llamada a M.p espera 1 argumento(s) y recibio 0`
- `El argumento para el parametro 'x' (out) debe ser una variable o un elemento de arreglo`
- `Nombre no declarado en este alcance: y`
- `No se puede asignar a 'i' (es constante, parametro in o iterador)`
- `Variable condicion no declarada: c` · `La cond 'c' es un arreglo: falta el indice`
- `wait/signal/signal_all solo pueden usarse dentro de un procedure de monitor`
- `El codigo de inicializacion del monitor M no puede llamar a monitores ni usar wait/signal`
- `No hay variables globales: las variables van dentro de un monitor o de un process`
- `El programa debe tener al menos un proceso`
- `Ya existe un monitor o un process llamado M` · `Procedure duplicado 'p' en el monitor M`
- `Comentario de bloque sin cerrar` · `Cadena de texto sin cerrar`

- `La cola 'c' maneja 2 componente(s) (fijado en la linea 4) y este pop usa 1`

Errores de ejecución (terminan ese proceso): índice fuera de rango, división o módulo por
cero, `pop` sobre cola vacía.

Si ningún proceso queda listo y no todos terminaron, el simulador reporta **deadlock**.

---

## 10. Qué no existe

Fuera del alcance de esta versión, a propósito:

- Semáforos: `sem`, `P`, `V`. Bloque atómico `< >`. `await`. No están reservados: son
  nombres libres.
- `signal and wait`, `signal` con prioridad, `minrank`, `empty(cv)` sobre una condición.
- Sacar de una `ColaOrdenada` por otro criterio que no sea la primera componente.
- `break`, `continue`, `return`.
- Funciones o procedures fuera de un monitor; recursión.
- El modo de parámetro `inout`: solo `in` y `out`.
- Variables globales, mutables o constantes.
- Arreglos o `Cola` como parámetro de un procedure.
- Arreglos multidimensionales.
- Pasaje de mensajes, `send`/`receive`.

---

## 11. Ejemplo que usa casi todo

```c
monitor Asignador {
  int libres = 3;
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
