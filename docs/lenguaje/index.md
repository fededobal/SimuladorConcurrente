# Estructura del programa

Esta sección describe todo lo que acepta el núcleo del simulador: palabras reservadas,
tipos, monitores, procesos, instrucciones y expresiones. Los ejemplos compilan y se
comportan como se describe; los programas de ejemplo del menú se ejecutan en los tests del
núcleo. La gramática formal está en la [especificación](./especificacion).

Un programa tiene dos clases de declaraciones de nivel superior, en cualquier orden, y **al
menos un proceso**:

```c
monitor Recurso { ... }       // 1. monitores

process Cliente[i: 1..5] { }  // 2. procesos
```

**No hay variables globales**, de ningún tipo: toda variable vive dentro de un monitor
(permanente, compartida) o dentro de un proceso (local, privada). Es la regla central del
modelo: el estado compartido solo se toca con la exclusión mutua del monitor.

## Comentarios

```c
// de línea
/* de bloque,
   puede ocupar varias líneas */
int /* también entre tokens */ x = 1;
```

Un `/*` sin cerrar es error de compilación. Un `//` adentro de una cadena
(`text s = "http://x";`) no abre un comentario.

## Cómo se ejecuta

Cada sentencia (asignación, llamada a monitor, `wait`/`signal`, `write`, `push`/`pop`,
`skip`) es **un paso atómico** del planificador. Los bloques y la evaluación de las guardas
de `if`, `while` y `for` no ocupan un paso propio: se resuelven junto con la sentencia que
sigue. En un mismo instante **avanzan varios procesos a la vez**, cada uno una sentencia:
los procesos corren en paralelo, no entrelazados de a uno.

Con turnos al azar no todos avanzan en cada instante, unos van más rápido que otros, como en
la realidad; con turnos en ronda avanzan todos los listos. En los dos casos, el orden dentro
del instante es el que decide **quién gana el monitor** cuando dos lo piden a la vez. El que
pierde queda en la cola de entrada.

Que corran en paralelo no rompe nada: la exclusión mutua del monitor sigue serializando
todo lo que toca estado compartido. Por eso un contador dentro de un monitor da siempre el
mismo total, corran los procesos como corran, que es justamente la garantía que dan los
monitores.
