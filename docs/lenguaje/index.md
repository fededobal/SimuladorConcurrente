# Estructura del programa

Esta sección describe todo lo que acepta el simulador. Los ejemplos de cada página compilan
y se comportan como se describe.

Un programa tiene dos clases de declaraciones, en cualquier orden, y al menos un proceso:

```monitores
monitor Recurso { ... }       // monitores: el estado compartido y sus operaciones

process Cliente[i: 1..5] { }  // procesos: el código que se ejecuta concurrentemente
```

No hay variables globales. Toda variable vive dentro de un monitor (permanente y
compartida) o dentro de un proceso o un procedure (local y privada). Es la regla central del
modelo: el estado compartido solo se modifica dentro de un monitor, con exclusión mutua.

| Construcción | Página |
|---|---|
| Monitores, variables condición, procedures y parámetros | [Monitores](./monitores) |
| Procesos y familias de procesos | [Procesos](./procesos) |
| `int`, `double`, `bool`, `text` y arreglos | [Tipos y arreglos](./tipos) |
| `Cola` y `ColaOrdenada` | [Colas](./colas) |
| Operadores y precedencia | [Expresiones](./expresiones) |
| Qué nombres se ven desde cada lugar | [Alcance de los nombres](./alcance) |
| Sentencias | [Instrucciones](./instrucciones/) |

## Comentarios

```monitores
// de línea
/* de bloque,
   puede ocupar varias líneas */
int /* también entre símbolos */ x = 1;
```

Un `/*` sin cerrar es un error de compilación. Un `//` dentro de una cadena
(`text s = "http://x";`) no inicia un comentario.

## Mayúsculas

Las palabras reservadas aceptan cualquier combinación de mayúsculas: `Monitor`, `OR` y
`colaOrdenada` equivalen a `monitor`, `or` y `ColaOrdenada`. Los nombres que declara el
programa, en cambio, distinguen mayúsculas: si se declara `process P`, `p` es otro nombre.

## Ejecución

Cada sentencia ocupa un paso del proceso que la ejecuta, y en cada instante avanzan varios
procesos a la vez. El detalle está en [Instantes y turnos](/ejecucion/instantes-y-turnos).
