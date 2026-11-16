# Colas

El lenguaje tiene dos tipos de cola: `Cola`, que es FIFO, y `ColaOrdenada`, una cola de
prioridad. Las dos se usan con `push`, `pop` y `empty`.

## Cola (FIFO)

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

### Declaración con tipos

| Forma | Qué declara |
|---|---|
| `Cola c(int)` | Elementos de una componente |
| `Cola p(int, text)` | Tuplas de dos componentes |
| `ColaOrdenada g(int, text, text)` | Tuplas de tres; la primera es la clave de orden |
| `ColaOrdenada g(int, (text, text))` | La misma cola que la anterior: el grupo solo separa la clave del resto |

- Las componentes son tipos escalares: `int`, `double`, `bool`, `text`. Una cola no guarda
  colas ni arreglos.
- Se admite un solo grupo entre paréntesis, justo después de la primera componente, con
  tipos sueltos adentro. `(int, (text, (text)))` y `((int, text))` son error.

### Las tres formas de `push` y `pop`

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

- Más paréntesis que esos, como `push(g, ((id, (nombre, apellido))))`, es error de
  compilación.
- Un paréntesis con una sola expresión no es una tupla: `push(c, (a + b) * 2)` encola un
  solo número.

### Qué controla el compilador

| Control | Antes de correr |
|---|---|
| Cantidad de componentes | La de la declaración, en `push` y en `pop` |
| Tipo de cada componente | Con las conversiones de siempre: `int` donde va `double`, número donde va `text` |
| Destinos del `pop` | Cada variable tiene que poder guardar su componente |

Mensajes típicos:

```
Línea 3: Declarar la cola con los tipos de sus componentes: Cola p(tipo, ...)
Línea 5: La cola 'p' guarda (int, text): este pop tiene 1 componente y se esperaban 2
Línea 6: La componente 2 de 'p' es text y se está encolando un bool
Línea 7: La componente 1 de 'p' es int y no se puede guardar en 'b', que es bool
```

- `pop` sobre cola vacía es error de ejecución.
- `empty c` y `empty(c)` valen igual; sobre algo que no es una cola es error de compilación.
- En el panel Monitores una tupla se ve entre paréntesis, como se escribió: `(7, Ana)`.

## ColaOrdenada (cola de prioridad)

Mismas operaciones que `Cola`, pero el `push` inserta ordenado por la primera
componente en vez de al final:

```c
ColaOrdenada c(int, text);
push(c, 3, "tercero");
push(c, 1, "primero");
push(c, 2, "segundo");
pop(c, p, d);          // p=1, d="primero"
```

- Ordena por la primera componente (`x` en `push(c, x, y, z)`). Las demás viajan con ella
  como un registro y salen por los destinos restantes del `pop`.
- A igual clave, sale primero el que se encoló antes (inserción estable, FIFO entre
  iguales). Encolar `(1,"a") (1,"b") (0,"cero") (1,"c")` desencola `cero a b c`.
- Con una sola componente, ordena por el valor: `5 1 4 1 3` sale `1 1 3 4 5`.
- La clave, la primera componente de la declaración, tiene que ser `int`, `double` o
  `text`: se compara como número o en orden alfabético. Declararla `bool` es error de
  compilación.
- `Cola` sigue siendo FIFO pura: el tipo de la variable es lo único que cambia.

El programa de ejemplo [Guardia](/referencia/ejemplos#guardia-colaordenada-con-tuplas) usa
una `ColaOrdenada` de tuplas (gravedad, id).
