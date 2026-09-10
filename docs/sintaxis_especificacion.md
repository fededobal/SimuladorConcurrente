# Especificación de Sintaxis y Semántica — Lenguaje de Monitores

Define el lenguaje que acepta el núcleo del simulador (lexer + parser + VM, implementados
en Java). Es un pseudocódigo tipado, de estilo C, para la enseñanza de **monitores**
(memoria compartida, disciplina *signal and continue*). Ver `monitores.md` para la teoría.

---

## 1. Estructura del programa

Un programa tiene tres tipos de declaraciones de nivel superior, en cualquier orden:

1. **Constantes globales** — variables escalares declaradas fuera de todo monitor/proceso.
   Son de **solo lectura**; sirven para tamaños de arreglo y rangos de familias de procesos
   (`int N = 5;`). Asignarles un valor es error semántico.
2. **Monitores** — `monitor Nombre { ... }`.
3. **Procesos** — `process Nombre { ... }` o `process Nombre[i: desde..hasta] { ... }`.

Debe haber **al menos un proceso**. El estado compartido mutable **solo** puede vivir dentro
de un monitor.

**Comentarios:** `// línea` y `/* bloque */`.

---

## 2. Tipos y valores

| Tipo | Literales | Default |
|---|---|---|
| `int` | `0`, `42` | `0` |
| `double` | `3.14`, `0.5` | `0.0` |
| `boolean` | `true`, `false` | `false` |
| `text` | `"hola"` | `""` |
| `Cola` | — (se llena con `push`) | vacía |

### Arreglos

- Declaración: `tipo nombre[tamaño];` o `tipo nombre[tamaño] = ([tamaño] valorInicial);`
- El `tamaño` es una expresión constante (literal o constante global).
- Acceso base 0: `buf[i]`, `buf[(i + 1) % N]`.
- Aplica a `int`, `double`, `boolean`, `text` y a `cond` (ver §4).

### Cola (FIFO)

- Declaración: `Cola nombre;`
- `push(cola, elemento);` — encola al final. Se admite `push(cola, a, b)` (encola una tupla).
- `pop(cola, x);` — desencola el frente y lo asigna a `x`. `pop(cola, x, y)` desestructura
  una tupla. `pop` sobre cola vaciá es error de ejecución.
- `empty cola` — expresión booleana, `true` si la cola no tiene elementos.

---

## 3. Monitores

```
monitor Nombre {
    <declaraciones de variables permanentes>
    <declaraciones de variables condición>
    <sentencias de inicialización>         // opcional, se ejecutan una vez
    <procedures>
}
```

- Las variables permanentes y las `cond` solo son visibles dentro del monitor.
- El **orden** dentro del monitor es libre, pero por convención: permanentes, `cond`,
  inicialización, procedures.

### 3.1 Variables condición

```
cond noVacio;
cond turno[N];      // arreglo de variables condición (variables condición privadas)
```

### 3.2 Procedures

```
procedure nombre(p1: modo tipo, p2: modo tipo, ...) {
    <sentencias>
}
```

- **Modos de parámetro:** `in` (default — solo lectura), `out` (se copia al argumento del
  llamador al retornar; el argumento debe ser una variable/elemento de arreglo, no una
  expresión), `inout` (ambas).
- Si el modo se omite: `procedure op(x: int)` equivale a `procedure op(x: in int)`.
- Sin valor de retorno: los resultados salen por parámetros `out`/`inout`.
- Dentro del cuerpo se ven: parámetros, variables locales del procedure, variables
  permanentes del monitor y constantes globales. **No** se ven las locales del `process`
  que llamó.

### 3.3 Operaciones sobre variables condición

Solo válidas dentro de un procedure (con el monitor tomado):

- `wait(cv);` — siempre demora; libera el monitor.
- `signal(cv);` — despierta al primero de `cv` (no-op si está vacía); el que señaliza sigue.
- `signal_all(cv);` — despierta a todos los de `cv`.
- Con arreglos: `wait(turno[id]); signal(turno[id]);`

---

## 4. Procesos

```
process Nombre {
    <sentencias>
}

process Nombre[iterador: desde..hasta] {   // familia de procesos
    <sentencias>
}
```

- La familia instancia `hasta - desde + 1` procesos; cada uno recibe `iterador` como
  constante local (`process Filosofo[id: 0..4]` → `Filosofo[0]` … `Filosofo[4]`).
- `desde` y `hasta` son expresiones constantes.
- En el cuerpo de un proceso se ven: sus variables locales, el iterador y las constantes
  globales. Los nombres de monitor solo se usan para llamadas `Monitor.procedure(...)`.

---

## 5. Sentencias

| Sentencia | Forma |
|---|---|
| Declaración local | `int x = 0;` `boolean b;` `int a[3] = ([3] 0);` |
| Asignación | `x = expr;` `a[i] = expr;` |
| Incremento / decremento | `x++;` `x--;` |
| Llamada a monitor | `Monitor.procedure(arg1, arg2);` |
| Operación de condición | `wait(cv);` `signal(cv);` `signal_all(cv);` |
| Cola | `push(c, e);` `pop(c, x);` |
| Condicional | `if (cond) { ... } else { ... }` (el `else` y las llaves son opcionales) |
| Mientras | `while (cond) { ... }` |
| For (contador) | `for (int i = 0; i < N; i++) { ... }` |
| For (rango) | `for (int i = 1..N) { ... }` |
| Skip | `skip;` |

Toda sentencia (o la evaluación de una guarda, o una llamada a monitor) es un **paso
atómico** del scheduler: en cada instante avanza exactamente un proceso una sentencia.

---

## 6. Expresiones

- Aritméticas: `+ - * / %` sobre `int`/`double`.
- Comparación: `== != < <= > >=`.
- Booleanas: `and` `or` `not` (equivalentes: `&& || !`).
- Acceso a arreglo: `a[expr]`.
- `empty cola`.
- Paréntesis para agrupar.

Precedencia (de menor a mayor): `or` → `and` → `not` → comparación → `+ -` → `* / %` → unario.

---

## 7. Semántica de ejecución (resumen)

- **Un instante = una sentencia de un proceso.** El scheduler elige el proceso: por política
  (`random` o `round-robin`) o, en modo paso a paso, lo elige el usuario.
- **Exclusión mutua implícita:** a lo sumo un proceso dentro de cada monitor.
  - `Monitor.op(args)` con el monitor libre: el proceso entra y ejecuta el cuerpo.
  - Con el monitor ocupado: el proceso queda `BLOCKED` en la cola de entrada; reintenta al
    liberarse.
  - Al retornar del procedure: se copian los `out`/`inout`, se libera el monitor y **todos**
    los de la cola de entrada vuelven a competir.
- **`wait` / `signal` / `signal_all`:** disciplina *signal and continue* (ver `monitores.md`).
- **Deadlock:** ningún proceso listo y no todos terminados → se informa.

---

## 8. Gramática (EBNF)

```ebnf
programa      = { const_global | monitor | proceso } ;

const_global  = tipo_escalar ident [ "=" expr ] ";" ;

(* ---------- monitores ---------- *)
monitor       = "monitor" ident "{" { miembro_monitor } "}" ;
miembro_monitor = var_perm | cond_decl | procedure | sentencia ;
var_perm      = tipo ident [ "[" expr "]" ] [ "=" init_valor ] ";" ;
cond_decl     = "cond" ident [ "[" expr "]" ] { "," ident [ "[" expr "]" ] } ";" ;

procedure     = "procedure" ident "(" [ params ] ")" bloque ;
params        = param { "," param } ;
param         = ident ":" [ modo ] tipo_escalar ;
modo          = "in" | "out" | "inout" ;

(* ---------- procesos ---------- *)
proceso       = "process" ident [ "[" ident ":" expr ".." expr "]" ] bloque ;

(* ---------- sentencias ---------- *)
bloque        = "{" { sentencia } "}" ;
sentencia     = decl_local
              | asignacion
              | inc_dec
              | llamada_monitor
              | op_cond
              | op_cola
              | condicional
              | mientras
              | para
              | "skip" ";"
              | bloque ;

decl_local    = tipo ident [ "[" expr "]" ] [ "=" init_valor ] ";" ;
asignacion    = ident [ "[" expr "]" ] "=" expr ";" ;
inc_dec       = ident ( "++" | "--" ) ";" ;
llamada_monitor = ident "." ident "(" [ args ] ")" ";" ;
op_cond       = ( "wait" | "signal" | "signal_all" ) "(" ident [ "[" expr "]" ] ")" ";" ;
op_cola       = "push" "(" ident "," expr { "," expr } ")" ";"
              | "pop"  "(" ident "," ident { "," ident } ")" ";" ;
condicional   = "if" "(" expr ")" cuerpo [ "else" cuerpo ] ;
mientras      = "while" "(" expr ")" cuerpo ;
para          = "for" "(" tipo_escalar ident "=" expr ";" expr ";" inc_step ")" cuerpo
              | "for" "(" tipo_escalar ident "=" expr ".." expr ")" cuerpo ;
inc_step      = ident ( "++" | "--" ) | ident "=" expr ;
cuerpo        = bloque | sentencia ;
args          = expr { "," expr } ;

init_valor    = expr | "(" "[" expr "]" expr ")" ;

(* ---------- expresiones ---------- *)
expr          = expr_or ;
expr_or       = expr_and { ( "or" | "||" ) expr_and } ;
expr_and      = expr_not { ( "and" | "&&" ) expr_not } ;
expr_not      = [ "not" | "!" ] expr_cmp ;
expr_cmp      = expr_add [ ( "==" | "!=" | "<" | "<=" | ">" | ">=" ) expr_add ] ;
expr_add      = expr_mul { ( "+" | "-" ) expr_mul } ;
expr_mul      = expr_un { ( "*" | "/" | "%" ) expr_un } ;
expr_un       = [ "-" ] primario ;
primario      = numero | texto | "true" | "false"
              | "empty" ident
              | ident [ "[" expr "]" ]
              | "(" expr ")" ;

(* ---------- léxico ---------- *)
tipo          = tipo_escalar | "Cola" ;
tipo_escalar  = "int" | "double" | "boolean" | "text" ;
ident         = letra { letra | digito | "_" } ;
numero        = digito { digito } [ "." digito { digito } ] ;
texto         = '"' { caracter } '"' ;
```

**Palabras reservadas:** `monitor procedure cond process if else while for skip
wait signal signal_all push pop empty in out inout true false int double boolean text Cola
and or not`.
