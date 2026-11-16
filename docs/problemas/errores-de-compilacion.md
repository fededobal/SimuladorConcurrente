# Errores de compilación

Un error de compilación impide que el programa arranque. El mensaje aparece debajo del
editor, con el número de línea, y esa línea se marca en rojo. Se corrige el programa y se
vuelve a presionar **Paso** o **Ejecutar**.

Las tablas reúnen los mensajes más frecuentes. Los nombres entre comillas simples (`'x'`,
`M`) corresponden al programa que produjo el error.

## Estructura y sintaxis

| Mensaje | Causa | Corrección |
|---|---|---|
| `El programa debe tener al menos un proceso` | Solo hay monitores | Declarar al menos un `process` |
| `No se permiten variables globales` | Una variable declarada fuera de un monitor y de un proceso | Moverla a un monitor (si es compartida) o a un proceso |
| `Se esperaba ';' (se encontró 'else')` | Falta `;` al final de la sentencia anterior | Agregar el `;` |
| `Se esperaba '}' (se encontró 'fin del archivo')` | Una llave sin cerrar | Cerrar el bloque |
| `Sentencia no válida` | Una sentencia que el lenguaje no reconoce: un `;` después de la llave de un procedure, `...` como relleno, `--` como comentario | Ver [Notación de la cátedra](/introduccion/notacion-de-la-catedra) |
| `Se esperaba '=', '++' o '--' (se encontró '(')` | Una llamada a una función que no existe (`UsarCajero()`, `insertar(...)`), un procedure llamado sin el nombre del monitor, o `elseif` | Reemplazar la función según [Notación de la cátedra](/introduccion/notacion-de-la-catedra); llamar con `Monitor.procedure()`; escribir `else if` |
| `Carácter inesperado '→'` | La flecha de las clases | Quitarla: `if (c) wait(cv);` |
| `Comilla tipográfica “: las cadenas van entre comillas rectas (")` | Texto copiado de un documento | Reemplazar por comillas rectas |
| `Comentario de bloque sin cerrar` | Un `/*` sin `*/` | Cerrar el comentario |
| `El tipo se llama bool, no boolean` | Tipo de otro lenguaje | Escribir `bool` |
| `El resto de la división se escribe mod, no %` | Operador de otro lenguaje | Escribir `mod` |

## Nombres

| Mensaje | Causa | Corrección |
|---|---|---|
| `Nombre no declarado en este alcance: x` | La variable no existe, no se ve desde ese lugar, o está escrita con otras mayúsculas | Declararla, pasarla por parámetro o unificar las mayúsculas ([Alcance](/lenguaje/alcance)) |
| `Nombre no declarado en este alcance: N` | Un límite escrito con una constante sin declarar | Usar un número: `[id: 0..4]` |
| `Ya existe una variable local llamada 'i': elegí otro nombre para no taparla` | Un nombre repetido en un alcance que ve al anterior | Cambiar uno de los nombres |
| `Ya existe un monitor o un process llamado P` | Dos declaraciones de nivel superior con el mismo nombre | Cambiar uno de los nombres |
| `Procedure duplicado 'f' en el monitor M` | Dos procedures con el mismo nombre | Cambiar uno de los nombres |

## Tipos

| Mensaje | Causa | Corrección |
|---|---|---|
| `No se puede guardar un double en 'x', que es int` | El valor no es del tipo de la variable | Cambiar el tipo de la variable o el valor ([Tipos](/lenguaje/tipos)) |
| `La condición del if tiene que ser bool y es int` | Una condición numérica (`if (x)`) | Comparar: `if (x != 0)` |
| `Las comparaciones no se encadenan: en lugar de 'a < b < c' escribí 'a < b and b < c'` | `1 < x < 5` | `1 < x and x < 5` |
| `No se puede comparar un text con un int usando '<'` | Comparación entre tipos distintos | Comparar valores del mismo tipo |
| `Número fuera de rango: 99999999999999999999 no entra en un int (máximo 9223372036854775807)` | Un literal demasiado grande | Usar un número menor |

## Monitores y llamadas

| Mensaje | Causa | Corrección |
|---|---|---|
| `Monitor no declarado: M` | El monitor no existe o tiene otras mayúsculas | Revisar el nombre |
| `El monitor M no tiene un procedure 'g'` | El procedure no existe o tiene otras mayúsculas | Revisar el nombre |
| `La llamada a M.f espera 1 argumento(s) y recibió 0` | Cantidad de argumentos distinta de la de parámetros | Ajustar la llamada |
| `El argumento para el parámetro 'r' (out) debe ser una variable o un elemento de arreglo` | Un valor fijo donde se devuelve un resultado | Pasar una variable |
| `No se puede asignar a 'a' (es constante, parámetro in o iterador)` | Se modifica un parámetro de entrada | Declararlo `out` o copiarlo a una local |
| `Los parámetros de distinto grupo se separan con ';' (la coma separa nombres del mismo tipo)` | `(a: in int, b: in int)` | `(a, b: in int)` o `(a: in int; b: in int)` |
| `El modo inout no existe: un parámetro es in (se lee) u out (se devuelve)` | Modo de otro lenguaje | Usar `in` u `out` |
| `Un procedure de M no puede llamar a M.a: el proceso ya está dentro del monitor` | Un procedure llama a otro del mismo monitor | Repetir el código o reorganizar los procedures |
| `El monitor E es un arreglo: falta el índice, E[índice].f(...)` | Llamada sin índice a un arreglo de monitores | `E[i].f()` |
| `El código de inicialización del monitor M no puede llamar a monitores ni usar wait, signal o delay` | Sincronización en las sentencias sueltas del monitor | Moverla a un procedure |

## Sincronización y colas

| Mensaje | Causa | Corrección |
|---|---|---|
| `wait/signal/signal_all solo pueden usarse dentro de un procedure de monitor` | Usadas en un proceso | Moverlas a un procedure |
| `Variable condición no declarada: c` | Falta `cond c;` o es una variable de otro tipo | Declararla en el monitor |
| `La cond 'c' es un arreglo: falta el índice` | `wait(c)` con `cond c[3]` | `wait(c[i])` |
| `En la práctica no se permite preguntar si una variable condición está vacía` | `empty(cv)` | Contar los procesos dormidos en una variable entera |
| `Declarar la cola con los tipos de sus componentes: Cola c(tipo, ...)` | `Cola c;` | `Cola c(int);` ([Colas](/lenguaje/colas)) |
| `La cola 'c' guarda (int, text): este push tiene 1 componente y se esperaban 2` | Cantidad de componentes distinta de la declaración | Ajustar el `push` o el `pop` |
| `La componente 2 de 'c' es text y se está encolando un bool` | Tipo de componente distinto | Ajustar el valor o la declaración |
| `No se puede intercambiar 'a' (int) con 'd' (double): ':=:' necesita dos valores del mismo tipo` | Intercambio entre tipos distintos | Usar variables del mismo tipo |
