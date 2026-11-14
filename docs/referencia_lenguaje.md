# Referencia del lenguaje — qué se puede escribir en el simulador

Lista completa de palabras reservadas, instrucciones y expresiones que acepta el núcleo
(lexer + parser + validador semántico + VM). Los ejemplos de esta página compilan y se
comportan como se describe; la última verificación completa es del 23/09/2026.

Para la teoría de monitores ver [`monitores.md`](monitores.md); para la gramática formal en
EBNF, [`sintaxis_especificacion.md`](sintaxis_especificacion.md).

---

## 1. Palabras reservadas

Son **31**. Ninguna puede usarse como nombre de variable, monitor, procedure o proceso
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

No hay rastro de semáforos: `sem`, `await`, `p` y `v` **no son palabras reservadas**, son
identificadores comunes y se pueden usar como nombre de variable.

### Símbolos

| | |
|---|---|
| Aritméticos | `+` `-` `*` `/` (el resto es la palabra `mod`) |
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
int c[3];                 // el tamaño es una expresión int
```

Índice base 0: `a[0]`, `a[(i + 1) mod 3]`. Un índice fuera de rango es error de ejecución
(`Índice 5 fuera de rango para 'a' (tamaño 2)`). El tamaño va de 0 a 100 000 elementos.

Se declaran dentro de un monitor o como locales de un proceso. Un arreglo se usa siempre
elemento por elemento: `a = 5`, `a = b` o pasar `a` como argumento son errores de
compilación. La excepción es `write(a)`, que muestra el arreglo entero.

### Cola (FIFO)

```c
Cola c(int);              // cada elemento es un int
Cola p(int, text);        // cada elemento es una tupla (id, nombre)
push(c, 1);               // encola un elemento
push(p, 7, "Ana");        // encola UNA tupla de dos componentes
push(p, (7, "Ana"));      // lo mismo, con la tupla entre paréntesis
pop(c, x);                // desencola el frente
pop(p, a, b);             // desestructura la tupla: a=7, b="Ana"
pop(p, (a, b));           // lo mismo, con paréntesis
bool v = empty c;         // también empty(c)
```

**La declaración lleva los tipos de las componentes**, entre paréntesis y separados por
coma: `Cola c(int)`, `Cola p(int, text)`, `ColaOrdenada g(int, text, text)`. Son los tipos
escalares (`int`, `double`, `bool`, `text`); una cola no guarda colas ni arreglos. Después de
la primera componente se puede agrupar el resto entre paréntesis, para separar la clave de
los datos que viajan con ella: `ColaOrdenada g(int, (text, text))` declara **la misma cola**
que `ColaOrdenada g(int, text, text)`. Solo se admite ese grupo, justo después de la primera
componente y con tipos sueltos adentro: `(int, (text, (text)))` y `((int, text))` son error.

Las componentes de un `push` o un `pop` se escriben de tres formas, que significan lo
mismo sea cual sea la forma en que se declaró la cola:

```c
push(g, id, nombre, apellido);
push(g, (id, nombre, apellido));
push(g, (id, (nombre, apellido)));
pop(g, id, nombre, apellido);
pop(g, (id, nombre, apellido));
pop(g, (id, (nombre, apellido)));
```

Más paréntesis que esos, como `push(g, ((id, (nombre, apellido))))`, es error de compilación.
Un paréntesis con una sola expresión no es una tupla: `push(c, (a + b) * 2)` encola un
solo número.

Con los tipos declarados, el compilador controla cada `push` y cada `pop` **antes de
correr**: la cantidad de componentes y el tipo de cada una, con las conversiones de siempre
(un `int` donde va un `double`, un número donde va un `text`), y que cada destino del `pop`
pueda guardar su componente:

```
Línea 3: Declarar la cola con los tipos de sus componentes: Cola p(tipo, ...)
Línea 5: La cola 'p' guarda (int, text): este pop tiene 1 componente y se esperaban 2
Línea 6: La componente 2 de 'p' es text y se está encolando un bool
Línea 7: La componente 1 de 'p' es int y no se puede guardar en 'b', que es bool
```

`pop` sobre cola vacía sí es error de ejecución. En el panel Monitores una cola se muestra
con sus casilleros y una tupla entre paréntesis, como se escribió: `(7, Ana)`.

`empty` se puede escribir con o sin paréntesis: `empty c` o `empty(c)`. Aplicado a algo que
no es una cola es error de compilación.

### ColaOrdenada (cola de prioridad)

Mismas operaciones que `Cola` — `push`, `pop`, `empty` — pero el `push` **inserta ordenado
por la primera componente** en vez de al final:

```c
ColaOrdenada c(int, text);
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
- La clave (la primera componente de la declaración) tiene que ser `int`, `double` o
  `text`: se compara como número o en orden alfabético. Declararla `bool` es error de
  compilación.
- `Cola` sigue siendo FIFO pura: el tipo de la variable es lo único que cambia.

---

## 3. Tipos y conversiones

| Tipo | Valores | Por defecto |
|---|---|---|
| `int` | enteros de 64 bits | `0` |
| `double` | números con decimales | `0.0` |
| `bool` | `true`, `false` | `false` |
| `text` | cadenas entre comillas dobles | `""` |

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
llamar a otro monitor ni usar `wait`/`signal`. Si la inicialización no termina en 100 000
pasos (por ejemplo, un `while (true)`), el programa no arranca y se informa el error.

### Arreglos de monitores

```c
monitor Escritorio[id: 0..2] {
    cond vcCliente;
    text datos;
    procedure atencion(D: in text; R: out text) { ... }
}

process Cliente[c: 0..5] {
    int idE; text res;
    ...
    Escritorio[idE].atencion("papel", res);
}
```

Declara un monitor por índice (`Escritorio[0]`, `Escritorio[1]`, `Escritorio[2]`), cada uno
con sus propias variables permanentes, `cond` y cola de entrada. Adentro, `id` vale el índice
de ese monitor y es de solo lectura. Las llamadas llevan el índice, que puede ser cualquier
expresión `int`; un índice fuera del rango es error de ejecución. Llamar sin índice a un
arreglo de monitores, o con índice a un monitor común, es error de compilación. Se admiten
hasta 1000 monitores por arreglo.

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
procedure mirar(x: int) { ... }                      // sin modo = in
procedure nada() { ... }
procedure Pasar(idP, edad: in int; R: out text) { ... } // grupos con ';'
procedure request(int id, tiempo; text nombre) { ... }  // estilo C: siempre in
```

- Los grupos de parámetros se separan con **`;`**; la coma separa nombres del mismo modo y
  tipo. `(a: in int, b: in int)` es error: se escribe `(a, b: in int)` o
  `(a: in int; b: in int)`.
- **`in`** (default): solo lectura, asignarle adentro es error.
- **`out`**: se copia al argumento del llamador al retornar.
- El argumento de un `out` tiene que ser una variable o un elemento de arreglo
  asignable — `M.dar(3)` es error.
- Los parámetros son **escalares**: no se pasan arreglos ni `Cola`.
- El tipo del argumento tiene que coincidir con el del parámetro, con las conversiones de
  §3. En un `out` el valor va del parámetro al argumento: `procedure dar(r: out int)` puede
  devolver a una variable `int`, `double` o `text`, pero no a una `bool`.
- No hay valor de retorno; los resultados salen por `out`.
- Un procedure no puede llamar a otro de su propio monitor (error de compilación). Sí puede
  llamar a otro monitor, y **conserva el suyo** hasta que esa llamada termina, aunque haga
  `wait` en el otro (ver `monitores.md` §2.3).

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
- Si `desde > hasta` no se instancia ningún proceso. Entre todas las familias y procesos
  sueltos, el programa admite hasta 5000 procesos.
- En el cuerpo se ven: las locales del proceso y el iterador. Los nombres de monitor solo
  aparecen en llamadas.

---

## 6. Instrucciones

| Instrucción | Formas aceptadas |
|---|---|
| Declaración | `int x;` · `int x = 0;` · `int a[3];` · `int a[3] = ([3] 0);` · `Cola c(int);` · `ColaOrdenada g(int, text, text);` · `ColaOrdenada g(int, (text, text));` · varias del mismo tipo: `text lista, comp;` · `int i = 0, j;` |
| Asignación | `x = expr;` · `a[i] = expr;` |
| Incremento | `x++;` · `x--;` · `a[i]++;` · `a[i]--;` |
| Llamada a monitor | `Monitor.procedure();` · `Monitor.procedure(a, b);` · `Escritorio[i].procedure(a);` |
| Condición | `wait(cv);` · `signal(cv);` · `signal_all(cv);` · con índice: `wait(cv[i]);` |
| Cola | `push(c, e);` · `push(c, e1, e2);` · `push(c, (e1, e2));` · `push(c, (e1, (e2, e3)));` · `pop(c, x);` · `pop(c, x, y);` · `pop(c, (x, y));` · `pop(c, (x, (y, z)));` |
| Salida | `write(e);` · `write(e1, e2, ...);` |
| Condicional | `if (e) S` · `if (e) S else S` · con o sin llaves |
| Mientras | `while (e) S` · con o sin llaves |
| For | ver abajo |
| Bloque | `{ ... }` suelto |
| Nada | `skip;` |
| Demora | `delay(segundos);` |

En una declaración con varios nombres, el valor inicial es solo del nombre que lo lleva:
`int i = 0, j;` deja `j` en `0` por ser el valor por defecto, no por el `= 0` de `i`.

Cada sentencia (asignación, llamada a monitor, `wait`/`signal`, `write`, `push`/`pop`,
`skip`) es **un paso atómico** del scheduler. Los bloques y la evaluación de las guardas de
`if`, `while` y `for` no ocupan un paso propio: se resuelven junto con la sentencia que
sigue. En un mismo instante **avanzan varios procesos a la vez**, cada uno una sentencia:
los procesos corren en paralelo, no entrelazados de a uno.

Con turnos al azar no todos avanzan en cada instante —unos van más rápido que otros, como
en la realidad—; con turnos en ronda avanzan todos los listos. En los dos casos, el
orden dentro del instante es el que decide **quién gana el monitor** cuando dos lo piden a la
vez. El que pierde queda en la cola de entrada.

Que corran en paralelo no rompe nada: la exclusión mutua del monitor sigue serializando todo
lo que toca estado compartido. Por eso un contador dentro de un monitor da siempre el mismo
total, corran los procesos como corran — que es justamente la garantía que dan los monitores.

### `delay`

```c
delay(5);          // el proceso se demora 5 segundos
delay(t * 2);      // cualquier expresión int, de 0 a 3600
```

Demora al proceso esa cantidad de **segundos reales**, contados desde el instante en que
ejecuta el `delay`. Mientras tanto el proceso figura "en delay" (verde punteado) y, al lado
de su nombre en el editor, un contador muestra los segundos que faltan. Si el `delay` está
dentro de un procedure, el proceso **sigue teniendo tomado el monitor**: los demás esperan
en la cola de entrada, como en el ejercicio del partido de fútbol de la práctica.

Si ningún proceso puede avanzar pero alguno está en `delay`, no es un interbloqueo: el
simulador espera a que termine. No se puede usar en el código de inicialización de un
monitor. Como depende del reloj, un programa con `delay` no se repite igual aunque se use
la misma semilla.

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

Las formas que declaran el iterador (`int i`) no se pueden usar si ya existe una variable
`i` visible (ver §8): en ese caso va la forma que la reusa.

En `for (1..n)` el iterador existe pero no tiene nombre, así que el cuerpo no puede leerlo:
se usa cuando solo importa **cuántas veces** repetir.

En las formas de rango, el iterador es `int` y la cota se calcula **una sola vez**, al
entrar: si el cuerpo cambia `n`, el `for` da igual la cantidad de vueltas que tenía al
empezar. En todas las formas, el iterador solo lo cambia el paso del `for`: asignarlo dentro
del cuerpo es error de compilación.

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
| 6 | `*` `/` `mod` | izquierda |
| 7 (mayor) | `-` unario | prefijo |

Primarios: un número, una cadena, `true`, `false`, `empty cola` (o `empty(cola)`), una
variable, un elemento de arreglo (`a[i]`) o una expresión entre paréntesis.

Tipos de las operaciones:

- `+ - * /` entre números: `int` si los dos son `int`, si no `double`. `/` entre dos `int`
  es la división entera (`7 / 2` da `3`).
- `mod` entre dos `int` es el resto entero; con algún `double`, el resto real (`5.5 mod 2` da `1.5`).
- `+` con un `text` concatena: `"total: " + 3` da `"total: 3"`.
- `==` y `!=` comparan dos números o dos valores del mismo tipo; `< <= > >=`, dos números o
  dos `text` (orden alfabético). Comparar un `text` con un número es error de compilación.
  Dos `int` se comparan exactos, sin redondeo.
- `and`, `or` y `not` se aplican a `bool`.

Una expresión puede anidar hasta 100 niveles de paréntesis y encadenar hasta 200
operaciones; más que eso es error de compilación (lo mismo vale para bloques anidados).

`and` y `or` evalúan en **corto circuito**: en `false and 1/0 == 0` la división nunca se
ejecuta.

La comparación **no encadena**: `1 < 2 < 3` es error de compilación ("Las comparaciones no
se encadenan"). Hay que escribir `1 < 2 and 2 < 3`.

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

`write` se puede usar tanto en un proceso como dentro de un procedure de monitor. Acepta
cualquier tipo, incluso un arreglo o una cola enteros (`write(a)` muestra `[0, 0, 0]`).

La pantalla guarda las últimas 500 líneas; si el programa escribe más, arriba aparece un
aviso con la cantidad de líneas anteriores que se descartaron.

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

No se puede asignar a: un parámetro `in`, el iterador de una familia ni el iterador de un
`for` dentro de su cuerpo.

Ningún nombre puede **tapar** a otro que ya se ve: una local no puede llamarse como una
permanente, un parámetro, un iterador, una `cond` u otra local visible. Dos bloques hermanos
sí pueden usar el mismo nombre, porque uno no ve al otro:

```c
process P[i: 0..1] {
  for (int i = 0..5) { skip; }   // error: ya existe el iterador de la familia 'i'
  { int x = 1; }
  { text x = "a"; }              // válido: el primer x ya no se ve
}
```

---

## 9. Qué avisa el compilador

Errores de compilación (con número de línea), verificados:

- `Monitor no declarado: X` · `El monitor M no tiene un procedure 'q'`
- `La llamada a M.p espera 1 argumento(s) y recibió 0`
- `El argumento para el parámetro 'x' (out) debe ser una variable o un elemento de arreglo`
- `Nombre no declarado en este alcance: y`
- `No se puede asignar a 'i' (es constante, parámetro in o iterador)`
- `No se puede modificar el iterador 'i' dentro del for: lo cambia solo el paso del for`
- `Ya existe una variable permanente llamada 'cant': elegí otro nombre para no taparla`
- `La condición del if tiene que ser bool y es int` · `No se puede guardar un double en 'x', que es int`
- `No se puede comparar un text con un int usando '=='` · `El operador '*' se aplica a números, no a un text y un int`
- `'a' es un arreglo: falta el índice, a[índice]` · `No se puede asignar el arreglo 'a' completo: hay que indicar el índice, a[índice]`
- `Variable condición no declarada: c` · `La cond 'c' es un arreglo: falta el índice`
- `wait/signal/signal_all solo pueden usarse dentro de un procedure de monitor`
- `El código de inicialización del monitor M no puede llamar a monitores ni usar wait/signal`
- `Un procedure de A no puede llamar a A.g: el proceso ya está dentro del monitor`
- `No hay variables globales: las variables van dentro de un monitor (permanentes) o de un process (locales)`
- `El programa debe tener al menos un proceso`
- `Ya existe un monitor o un process llamado M` · `Procedure duplicado 'p' en el monitor M`
- `Las comparaciones no se encadenan: en lugar de 'a < b < c' escribí 'a < b and b < c'`
- `El modo inout no existe: un parámetro es in (se lee) u out (se devuelve)`
- `El tipo se llama bool, no boolean` · `El resto de la división se escribe mod, no %`
- `Los parámetros de distinto grupo se separan con ';' (la coma separa nombres del mismo tipo)`
- `En la práctica no se permite preguntar si una variable condición está vacía` (al escribir
  `empty(cv)` sobre una `cond`: para saber si hay procesos dormidos, se cuentan con un entero)
- `Comentario de bloque sin cerrar` · `Cadena de texto sin cerrar` · `Comilla tipográfica “: las cadenas van entre comillas rectas (")`
- `La cola 'c' maneja 2 componente(s) (fijado en la línea 4) y este pop usa 1`
- `El programa tiene demasiados niveles de anidamiento (máximo 100)`

Errores de ejecución (terminan ese proceso, que queda marcado en rojo con su línea):
índice fuera de rango, división o módulo por cero, desborde de un `int`, resultado `double`
no representable, tamaño de arreglo inválido, `pop` sobre cola vacía, un valor sacado de una
cola que no se puede guardar en el destino.
Si después de un error los demás procesos quedan bloqueados, el estado dice "deadlock tras
un error": la causa es el error, no la sincronización.

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
- Secuencias de escape en las cadenas (`\"`, `\n`): una comilla doble no puede ir dentro de
  un texto.
- Arreglos o `Cola` como parámetro de un procedure.
- Arreglos multidimensionales.
- Pasaje de mensajes, `send`/`receive`.

---

## 11. Ejemplo que usa casi todo

```c
monitor Asignador {
  int libres = 3;
  bool tomado[3] = ([3] false);
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
