# Qué avisa el compilador

El compilador se detiene en el primer error y lo informa con el número de línea, que el
editor marca en rojo. Los mensajes describen qué está mal y cómo se escribe la construcción,
con los nombres del programa del alumno. Esta página los reúne por tema; cada mensaje se
muestra como aparece en pantalla, con nombres de ejemplo.

## Escritura

| Mensaje | Qué significa |
|---|---|
| `Comentario de bloque sin cerrar` | Un `/*` sin su `*/`. |
| `Cadena de texto sin cerrar` | Una comilla doble sin su pareja antes del fin de la línea. |
| `Comilla tipográfica “: las cadenas van entre comillas rectas (")` | El texto se pegó desde un procesador de textos. |
| `El tipo se llama bool, no boolean` | |
| `El resto de la división se escribe mod, no %` | |
| `Carácter inesperado '$'` | Un símbolo que no pertenece al lenguaje. |
| `Se esperaba ';' (se encontró '}')` y similares | Falta un símbolo; el mensaje dice cuál se esperaba y qué se encontró en su lugar. |
| `Sentencia no válida` | Una línea que no empieza como ninguna sentencia del lenguaje, por ejemplo una expresión suelta o una llave de más. |
| `Se esperaba una expresión` | Falta el valor después de `=` o dentro de un paréntesis. |
| `Las comparaciones no se encadenan: en lugar de 'a < b < c' escribí 'a < b and b < c'` | |
| `Número fuera de rango: 99999999999999999999 no entra en un int (máximo 9223372036854775807)` | |
| `El programa tiene demasiados niveles de anidamiento (máximo 100)` | También para una expresión con más de 200 operaciones encadenadas. |

## Estructura del programa

| Mensaje | Qué significa |
|---|---|
| `No se permiten variables globales` | Una declaración fuera de un monitor o de un proceso. |
| `Se esperaba 'monitor' o 'process'` | De nivel superior solo hay monitores y procesos. |
| `El programa debe tener al menos un proceso` | |
| `Ya existe un monitor o un process llamado M` | |
| `Variable permanente duplicada 'x' en el monitor M` | |
| `Nombre de cond duplicado 'c' en el monitor M` | |
| `Ya existe una variable permanente llamada 'c' en el monitor M: la cond necesita otro nombre` | Una variable y una cond comparten el nombre; el mensaje nombra a la que se declaró primero. |
| `Procedure duplicado 'f' en el monitor M` | |
| `Parámetro duplicado 'a' en M.f` | |

## Procedures y parámetros

| Mensaje | Qué significa |
|---|---|
| `Se esperaba ':' después del nombre del parámetro` | La forma es `nombre: modo tipo`. |
| `El modo inout no existe: un parámetro es in (se lee) u out (se devuelve)` | |
| `Se esperaba un tipo escalar (int, double, bool, text) para el parámetro` | No se pasan arreglos ni colas. |
| `Los parámetros de distinto grupo se separan con ';' (la coma separa nombres del mismo tipo)` | |
| `El código de inicialización del monitor M no puede llamar a monitores ni usar wait, signal o delay` | |
| `Un procedure de A no puede llamar a A.g: el proceso ya está dentro del monitor` | |
| `No se puede asignar a 'a' (es constante, parámetro in o iterador)` | Un parámetro `in`, el índice de una familia o el iterador de un `for`. |

## Llamadas a monitores

| Mensaje | Qué significa |
|---|---|
| `Monitor no declarado: M` | |
| `El monitor M no tiene un procedure 'g'` | |
| `La llamada a M.f espera 1 argumento(s) y recibió 0` | |
| `No se puede guardar un text en 'a', que es int` | El tipo de un argumento no coincide con el del parámetro, con las conversiones admitidas. |
| `El argumento para el parámetro 'a' (out) debe ser una variable o un elemento de arreglo` | |
| `El parámetro out 'a' es int y no se puede guardar en 't', que es bool` | |
| `El monitor E es un arreglo: falta el índice, E[índice].f(...)` | |
| `El monitor M no es un arreglo: se llama sin índice` | |

## Variables condición

| Mensaje | Qué significa |
|---|---|
| `wait/signal/signal_all solo pueden usarse dentro de un procedure de monitor` | |
| `Variable condición no declarada: c` | |
| `La cond 'c' es un arreglo: falta el índice` | |
| `La cond 'c' no es un arreglo` | |
| `El índice de la cond tiene que ser int y es text` | |
| `En la práctica no se permite preguntar si una variable condición está vacía` | `empty` no se aplica a una `cond`: para saber si hay procesos dormidos se cuentan con un entero. |

## Tipos y expresiones

| Mensaje | Qué significa |
|---|---|
| `No se puede guardar un text en 'x', que es int` | También `double` en `int` (no se trunca) y `bool` en un número. |
| `La condición del if tiene que ser bool y es int` | Igual para `while` y `for`. |
| `El operador '*' se aplica a números, no a un text y un int` | |
| `'and' une dos bool, no un int y un int` | |
| `'not' se aplica a un bool, no a un int` | |
| `El '-' se aplica a un número, no a un text` | |
| `No se puede comparar un text con un int usando '=='` | |
| `'t' es text: ++ y -- se aplican a números` | |
| `El tiempo del delay tiene que ser int y es text` | |

## Nombres y alcance

| Mensaje | Qué significa |
|---|---|
| `Nombre no declarado en este alcance: x` | También cuando una local del proceso se usa dentro de un procedure. |
| `Ya existe una variable local llamada 'x': elegí otro nombre para no taparla` | Ningún nombre tapa a otro visible; el mensaje dice qué es lo que ya existe (variable permanente, parámetro, iterador). |
| `Ya existe una variable condición llamada 'c': elegí otro nombre` | |
| `No se puede modificar el iterador 'i' dentro del for: lo cambia solo el paso del for` | |
| `El iterador de un for de rango tiene que ser int` | |
| `La cota del for tiene que ser int y es text` | |

## Arreglos

| Mensaje | Qué significa |
|---|---|
| `'a' es un arreglo: falta el índice, a[índice]` | Un arreglo se usa elemento por elemento. |
| `No se puede asignar el arreglo 'a' completo: hay que indicar el índice, a[índice]` | |
| `'x' no es un arreglo` | Un índice sobre un escalar. |
| `El tamaño de 'a' tiene que ser int y es text` | |
| `El índice de 'a' tiene que ser int y es bool` | |
| `Se esperaba '(' para inicializar el arreglo` | La forma es `int a[3] = ([3] 0);`. |

## Colas

| Mensaje | Qué significa |
|---|---|
| `Declarar la cola con los tipos de sus componentes: Cola c(tipo, ...)` | |
| `La primera componente de 'c' va sin paréntesis; el grupo entre paréntesis va después de ella: Cola c(tipo, (tipo, ...))` | |
| `Dentro del grupo de 'c' van solo tipos, sin más paréntesis: Cola c(tipo, (tipo, ...))` | |
| `Después del grupo entre paréntesis se cierra la declaración de 'c': Cola c(tipo, (tipo, ...))` | |
| `El grupo entre paréntesis de 'c' va justo después de la primera componente: Cola c(tipo, (tipo, ...))` | |
| `Las componentes de una cola son int, double, bool o text (se encontró 'Cola')` | |
| `La clave de la ColaOrdenada 'c' (su primera componente) tiene que ser int, double o text, no bool` | |
| `Sobran paréntesis en el push a 'c'; las formas válidas son push(c, componentes), push(c, (componentes)) o push(c, (clave, (resto)))` | Igual para `pop`, con destinos. |
| `Los paréntesis de la tupla van alrededor de todas las componentes; las formas válidas son ...` | |
| `El grupo entre paréntesis va justo después de la primera componente: push(c, (clave, (resto)))` | |
| `La cola 'c' guarda (int, text): este push tiene 1 componente y se esperaban 2` | |
| `La componente 1 de 'c' es int y se está encolando un text` | |
| `La componente 2 de 'c' es text y no se puede guardar en 'y', que es int` | |
| `'x' no es una cola` | `push`, `pop` o `empty` sobre algo que no es una cola. |
| `'d' es una cola: se usa con push, pop y empty` | Una cola usada como valor, encolada o pasada como argumento. |
| `No se puede asignar la cola 'c': se usa con push y pop` | |

## Errores de ejecución

Ocurren mientras el programa corre. Terminan el proceso que los provoca, que queda marcado
en rojo con su línea y su mensaje, y liberan los monitores que tuviera tomados; los demás
procesos siguen.

| Mensaje | Qué significa |
|---|---|
| `Índice 5 fuera de rango para 'a' (tamaño 2)` | También para un arreglo de monitores o de `cond`. |
| `División por cero` · `Módulo por cero` | |
| `Desborde de entero: el resultado no entra en un int` | |
| `Resultado no representable: la cuenta con double se desborda o no está definida` | Un `double` infinito o indefinido. |
| `Tamaño de arreglo inválido: -1 (tiene que estar entre 0 y 100000)` | |
| `pop sobre la cola vacía 'c'` | |
| `El delay tiene que ser de 0 a 3600 segundos y es de -1` | |
| `Demasiados procesos: el simulador admite hasta 5000 en total` | También `Demasiados monitores en E: el simulador admite hasta 1000 por arreglo`. |
| `La inicialización del monitor M no terminó después de 100000 pasos: revisá si tiene un ciclo infinito` | |

Si después de un error los demás procesos quedan bloqueados, el estado dice "deadlock tras
un error": la causa es el error, no la sincronización. Si ningún proceso queda listo y no
todos terminaron, el simulador reporta el interbloqueo (*deadlock*).
