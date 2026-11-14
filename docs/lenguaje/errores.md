# Qué avisa el compilador

El compilador se detiene en el primer error y lo informa con el número de línea, que el
editor marca en rojo. Los mensajes describen qué está mal y cómo se escribe, con los
nombres del programa del alumno. Algunos, verificados:

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
- `El código de inicialización del monitor M no puede llamar a monitores ni usar wait, signal o delay`
- `Un procedure de A no puede llamar a A.g: el proceso ya está dentro del monitor`
- `No se permiten variables globales`
- `El programa debe tener al menos un proceso`
- `Ya existe un monitor o un process llamado M` · `Procedure duplicado 'p' en el monitor M`
- `Las comparaciones no se encadenan: en lugar de 'a < b < c' escribí 'a < b and b < c'`
- `El modo inout no existe: un parámetro es in (se lee) u out (se devuelve)`
- `El tipo se llama bool, no boolean` · `El resto de la división se escribe mod, no %`
- `Los parámetros de distinto grupo se separan con ';' (la coma separa nombres del mismo tipo)`
- `En la práctica no se permite preguntar si una variable condición está vacía` (al
  escribir `empty(cv)` sobre una `cond`: para saber si hay procesos dormidos, se cuentan con
  un entero)
- `Comentario de bloque sin cerrar` · `Cadena de texto sin cerrar` · `Comilla tipográfica “: las cadenas van entre comillas rectas (")`
- `Declarar la cola con los tipos de sus componentes: Cola c(tipo, ...)` · `La cola 'c' guarda (int, text): este pop tiene 1 componente y se esperaban 2`
- `El programa tiene demasiados niveles de anidamiento (máximo 100)`

## Errores de ejecución

Terminan el proceso que los provoca, que queda marcado en rojo con su línea, y liberan los
monitores que tuviera tomados: índice fuera de rango, división o módulo por cero, desborde
de un `int`, resultado `double` no representable, tamaño de arreglo inválido, `pop` sobre
cola vacía, un índice fuera de rango sobre un arreglo de monitores o de `cond`, y un `delay`
fuera de 0 a 3600 segundos.

Si después de un error los demás procesos quedan bloqueados, el estado dice "deadlock tras
un error": la causa es el error, no la sincronización.

Si ningún proceso queda listo y no todos terminaron, el simulador reporta el interbloqueo
(*deadlock*).
