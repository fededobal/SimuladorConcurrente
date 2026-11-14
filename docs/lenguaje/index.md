# Estructura del programa

Esta sección describe todo lo que acepta el núcleo del simulador: palabras reservadas,
tipos, monitores, procesos, instrucciones y expresiones. Los ejemplos compilan y se
comportan como se describe; los programas de ejemplo del menú se ejecutan en los tests del
núcleo.

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

| Regla | Detalle |
|---|---|
| Una sentencia, un paso | Asignación, llamada a monitor, `wait`/`signal`, `write`, `push`/`pop`, `skip` |
| Las guardas no cuentan | La evaluación de `if`, `while` y `for` y los bloques van junto con la sentencia siguiente |
| Varios a la vez | En un instante avanzan varios procesos, una sentencia cada uno; corren en paralelo, no de a uno |
| Quién gana el monitor | El orden dentro del instante; el que pierde queda en la cola de entrada |

::: tip
La exclusión mutua del monitor serializa todo lo que toca estado compartido: un contador
dentro de un monitor da siempre el mismo total, corran los procesos como corran.
:::
