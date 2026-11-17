# Qué es un monitor

Esta sección resume los conceptos de monitores tal como los presenta la cátedra de
Programación Concurrente (Teoría 4) y aclara, en cada punto, qué implementa el simulador y
qué queda afuera de esta versión.

Un **monitor** es un módulo de programa con más estructura que los semáforos: un mecanismo
de abstracción de datos que encapsula la representación de un recurso compartido y ofrece
un conjunto de operaciones, los *procedures*, que son el único medio para manipularlo.

Contiene:

- **Variables permanentes**: almacenan el estado del recurso. Solo son accesibles desde
  adentro del monitor.
- **Procedures**: implementan las operaciones de la interfaz.
- **Código de inicialización**: se ejecuta una vez, antes de que cualquier proceso use el
  monitor.

Un programa concurrente se compone de procesos activos y monitores pasivos. Dos procesos
interactúan llamando a los procedures de un monitor. Un proceso que invoca un procedure
puede ignorar cómo está implementado; el programador del monitor puede ignorar quién y
cuándo lo llama.

Sintaxis de una llamada: `NombreMonitor.procedure(argumentos)`.

## Exclusión mutua implícita

El monitor garantiza que **a lo sumo un proceso ejecuta dentro del monitor a la vez**. Los
procedures de un mismo monitor nunca se ejecutan concurrentemente. El programador no
escribe ningún protocolo de entrada ni de salida: es responsabilidad del monitor.

Si un proceso llama a un procedure mientras otro está adentro, queda demorado en la **cola
de entrada** del monitor hasta que el monitor se libere.

Cuando el monitor se libera, todos los procesos de la cola de entrada compiten por él y
**no acceden en orden de llegada** (Explicación práctica 3). En el simulador, uno de ellos,
elegido al azar, entra en ese mismo instante y el resto sigue esperando
([ADR 0005](/decisiones/0005-traspaso-del-monitor-a-la-cola-de-entrada) y
[ADR 0006](/decisiones/0006-entrada-al-monitor-sin-orden-de-llegada)).

## Sincronización por condición explícita

Cuando un proceso necesita esperar a que se cumpla una condición sobre el estado del
recurso, usa [variables condición](./variables-condicion).

## Notación del simulador

```monitores
monitor NombreMonitor {
    // variables permanentes
    int cant = 0;
    cond noVacio, noLleno;

    // (opcional) código de inicialización: sentencias sueltas antes de los procedures

    procedure op1(par: in int) {
        // cuerpo
    }

    procedure verificar(R: out int) {
        R = cant;
    }
}
```

- **Parámetros**: `in` (por defecto, solo lectura) y `out` (se escribe y se copia de vuelta
  al argumento del llamador al retornar). No existe `inout`. La llamada
  `TOTAL.verificar(c)` deja el resultado en la variable `c` del llamador.
- Las variables permanentes solo se ven dentro del monitor. Las variables locales de un
  `process` no son visibles dentro de un procedure.
- Todo el estado compartido del programa vive dentro de algún monitor. No hay variables ni
  constantes globales: el tamaño de un arreglo o el rango de una familia de procesos se
  escribe con un número o con una expresión que no depende de variables compartidas.

La descripción completa de lo que se puede escribir está en la sección
[Lenguaje](/lenguaje/).
