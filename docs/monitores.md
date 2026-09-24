# Sincronización con Monitores

Documento de referencia teórica para el simulador. Resume los conceptos de **monitores**
tal como los presenta la cátedra de Programación Concurrente (Teoría 4 / Clase 4) y aclara,
en cada punto, **qué implementa el simulador** y qué queda afuera de esta versión.

---

## 1. Concepto

Un **monitor** es un módulo de programa con más estructura que los semáforos: un mecanismo
de **abstracción de datos** que encapsula la representación de un recurso compartido y
ofrece un conjunto de operaciones (`procedures`) que son el único medio para manipularlo.

Contiene:

- **Variables permanentes**: almacenan el estado del recurso. Solo son accesibles desde
  adentro del monitor.
- **Procedures**: implementan las operaciones de la interfaz.
- **Código de inicialización**: se ejecuta una vez, antes de que cualquier proceso use el
  monitor.

**Programa concurrente = procesos activos + monitores pasivos.** Dos procesos interactúan
llamando a los procedures de un monitor. Un proceso que invoca un procedure puede ignorar
cómo está implementado; el programador del monitor puede ignorar quién y cuándo lo llama.

Sintaxis de una llamada: `NombreMonitor.procedure(argumentos)`.

### 1.1 Exclusión mutua — implícita

El monitor garantiza que **a lo sumo un proceso ejecuta dentro del monitor a la vez**. Los
procedures de un mismo monitor nunca se ejecutan concurrentemente. El programador no
escribe ningún protocolo de entrada/salida: es responsabilidad del monitor.

Si un proceso llama a un procedure mientras otro está adentro, queda demorado en la **cola
de entrada** del monitor hasta que el monitor se libere.

### 1.2 Sincronización por condición — explícita

Cuando un proceso necesita esperar a que se cumpla una condición sobre el estado del
recurso, usa **variables condición**.

---

## 2. Variables condición

```
cond cv;
```

El valor asociado a `cv` es una **cola de procesos demorados**, no visible directamente
para el programador. Operaciones:

- **`wait(cv)`** — el proceso se demora al final de la cola de `cv` **y libera el acceso
  exclusivo al monitor**. Siempre se bloquea (a diferencia del `P` de un semáforo).
- **`signal(cv)`** — despierta al proceso que está al frente de la cola de `cv` (si hay
  alguno) y lo saca de ella. Si la cola está vacía, `signal` **no tiene efecto** (a
  diferencia del `V` de un semáforo, que incrementa el contador).
- **`signal_all(cv)`** (broadcast) — despierta a **todos** los procesos demorados en `cv`;
  la cola queda vacía.

### 2.1 Disciplina de señalización: **Signal and Continue**

Es la única disciplina que usa la cátedra **y la única que implementa el simulador**.

- El proceso que hace `signal` **continúa** ejecutando dentro del monitor (conserva el
  acceso exclusivo).
- El proceso despertado **pasa a competir** por volver a entrar al monitor, para continuar
  en la instrucción que lógicamente sigue al `wait`.

Consecuencia práctica: entre el `signal` y el momento en que el proceso despertado
realmente reanuda, otros procesos pudieron entrar al monitor y cambiar el estado. Por eso
la condición **debe re-evaluarse en un `while`**, no en un `if`:

```
procedure retirar(...) {
    while (cantidad == 0) wait(not_vacio);   // while, NO if
    ...
}
```

> **No implementado:** *Signal and Wait* (el que señaliza cede el monitor y el despertado
> entra de inmediato). Tampoco `wait(cv, rank)` / `minrank(cv)` (wait con prioridad) ni
> `empty(cv)`.

### 2.2 Estados de un proceso respecto de un monitor

1. **Compitiendo por el monitor** — quiere entrar (llamó a un procedure con el monitor
   ocupado, o fue despertado de una `cond` y todavía no reentró, o volvió de un `wait`).
2. **En la cola de una variable condición** — hizo `wait(cv)` y espera un `signal`.
3. **Ejecutando dentro del monitor** — tiene el acceso exclusivo.

En el simulador, el proceso que compite figura en ámbar rayado y el que espera en una
variable condición, en rojo rayado. El que avanzó en el último instante figura como
ejecutando, con el color del proceso; en la línea de tiempo, cada instante que ejecutó
dentro de un monitor lleva además una "M". Un proceso que podía avanzar pero al que el
planificador no le dio turno en ese instante figura como "sin turno".

### 2.3 Llamadas entre monitores

Un procedure de un monitor A puede llamar a un procedure de otro monitor B. El simulador usa
**llamadas abiertas** (ADR 0004): al llamar a B, el proceso libera A; al volver de B, compite
otra vez por A, igual que después de un `wait`. Los argumentos se evalúan antes de liberar A,
y un parámetro `out` que apunta a una variable de A se escribe recién al reingresar. Por eso,
después de la llamada el procedure no puede suponer que el estado de A sigue igual.

Un procedure no puede llamar a otro procedure de su propio monitor: es error de compilación.

---

## 3. Diferencia `wait`/`signal` (monitores) vs `P`/`V` (semáforos)

| | `wait(cv)` | `P(s)` |
|---|---|---|
| | El proceso **siempre** se duerme | Solo se duerme si `s == 0` |

| | `signal(cv)` | `V(s)` |
|---|---|---|
| | Si hay procesos dormidos, despierta al **primero**. Si no hay, **no tiene efecto posterior**. | Incrementa `s`; un proceso dormido o que hará `P` podrá continuar. No sigue ningún orden al despertar. |

---

## 4. Notación del simulador

```
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

- **Parámetros**: `in` (default, solo lectura) y `out` (se escribe y se copia de vuelta al
  argumento del llamador al retornar). No existe `inout`.
  La llamada `TOTAL.verificar(c)` deja el resultado en la variable `c` del llamador.
- Las variables permanentes **solo** se ven dentro del monitor. Las variables locales de un
  `process` **no** son visibles dentro de un procedure.
- Todo el **estado compartido** del programa vive dentro de algún monitor. No hay variables
  ni constantes globales: el tamaño de un arreglo o el rango de una familia de procesos se
  escribe con un número o con una expresión que no depende de variables compartidas.

---

## 5. Ejemplos canónicos (casos de prueba del simulador)

### 5.1 Contador compartido (`TOTAL`)

```
monitor TOTAL {
    int cant = 0;
    procedure incrementar() { cant = cant + 1; }
    procedure verificar(R: out int) { R = cant; }
}

process empleado[id: 0..4] {
    while (true) { TOTAL.incrementar(); }
}
process coordinador {
    int c;
    while (true) { TOTAL.verificar(c); }
}
```

Muestra la **exclusión mutua implícita**: nunca hay dos procesos dentro de `TOTAL`.

### 5.2 Buffer de un dato (`cond P, C`)

```
monitor Buffer {
    int dato;
    boolean hayDato = false;
    cond P, C;
    procedure Enviar(D: in int) {
        if (hayDato) wait(P);
        dato = D; hayDato = true;
        signal(C);
    }
    procedure Recibir(R: out int) {
        if (not hayDato) wait(C);
        R = dato; hayDato = false;
        signal(P);
    }
}
```

### 5.3 Buffer limitado (condición en `while`)

```
monitor BufferLimitado {
    int N = 5;
    int buf[5];
    int ocupado = 0, libre = 0, cantidad = 0;
    cond notLleno, notVacio;
    procedure depositar(dato: in int) {
        while (cantidad == N) wait(notLleno);
        buf[libre] = dato; libre = (libre + 1) % N; cantidad++;
        signal(notVacio);
    }
    procedure retirar(res: out int) {
        while (cantidad == 0) wait(notVacio);
        res = buf[ocupado]; ocupado = (ocupado + 1) % N; cantidad--;
        signal(notLleno);
    }
}
```

### 5.4 Lectores y escritores (broadcast)

```
monitor ControladorRW {
    int nr = 0, nw = 0;
    cond okLeer, okEscribir;
    procedure pedidoLeer()  { while (nw > 0) wait(okLeer); nr++; }
    procedure liberaLeer()  { nr--; if (nr == 0) signal(okEscribir); }
    procedure pedidoEscribir() { while (nr > 0 or nw > 0) wait(okEscribir); nw++; }
    procedure liberaEscribir() { nw--; signal(okEscribir); signal_all(okLeer); }
}
```

`signal_all(okLeer)` despierta a todos los lectores demorados.

---

## 6. Técnicas de la cátedra — estado en el simulador

| Técnica | ¿En el simulador? |
|---|---|
| Sincronización por condición básica (`while` + `wait`/`signal`) | **Sí** |
| Broadcast signal (`signal_all`) | **Sí** |
| Passing the Condition (manejar el orden con variables/colas explícitas) | Se puede programar con `Cola` + varias `cond`; el simulador no lo asiste |
| Variables condición privadas (`cond turno[N]`) | **Sí** (arreglos de `cond`) |
| Covering conditions | Se puede programar (es `signal_all` + `while`) |
| Wait con prioridad (`wait(cv, rank)`, `minrank`) | **No** |
| Rendezvous / peluquero dormilón | Se puede programar con varias `cond` |
| Scheduling de disco, monitor intermedio | Fuera de alcance del prototipo |

---

## 7. Deadlock

El simulador no verifica propiedades de la sección crítica, pero **detecta deadlock de
ejecución**: si en algún instante no hay ningún proceso listo para ejecutar y no todos
terminaron (todos están demorados en colas de entrada o de variables condición), se informa
el interbloqueo.
