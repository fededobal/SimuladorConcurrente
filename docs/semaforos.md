# Sincronización con Semáforos

Este documento resume los conceptos, el comportamiento y los problemas clásicos resueltos mediante la técnica de sincronización por Semáforos (basado en la teoría 3).

## 1. Concepto de Semáforo
Es un Tipo de Dato Abstracto descrito por Dijkstra en 1968 diseñado para resolver las limitaciones y deficiencias del "busy waiting". Un semáforo incluye un entero no negativo y permite únicamente dos operaciones atómicas:
* **$P(s)$ (Wait / Proberen):** Se utiliza para demorar a un proceso hasta que ocurra un evento. Disminuye el contador.
  * *Lógicamente:* `< await (s > 0) s = s - 1; >`
* **$V(s)$ (Signal / Verhogen):** Señala la ocurrencia del evento. Incrementa el contador.
  * *Lógicamente:* `< s = s + 1; >`

> **Nota Crítica:** Un semáforo siempre debe inicializarse explícitamente en el momento de su declaración (ej. `sem mutex = 1;`).

### Tipos de semáforos:
* **Generales (Counting):** Su valor interno puede ser cualquier entero no negativo. Representan cantidad de recursos.
* **Binarios:** Solo toman valor 0 o 1. El $V(s)$ es `< await (b < 1) b = b + 1; >`.
* *Ventajas:* Al separar las variables de condición del programa, simplifican el diseño, permiten verificar su corrección matemáticamente y son mucho más eficientes en esquemas multiprogramados (ceden la CPU bloqueando el proceso en una cola).

## 2. Aplicaciones Básicas de los Semáforos
* **Exclusión Mutua:** Se inicializa un semáforo a 1 (`sem mutex = 1;`). El proceso invoca `P(mutex)` al iniciar su SC y `V(mutex)` al liberarla.
* **Señalización de eventos (Barreras para procesos):** Se inicializan semáforos en 0 (`sem llega1 = 0, llega2 = 0;`). Un proceso A avisa su llegada ejecutando `V(llega1)` y se bloquea esperando al proceso B ejecutando `P(llega2)`.

## 3. Problemas Clásicos

### Productores y Consumidores (Semáforos Binarios Divididos)
* **Split Binary Semaphore (SBS):** Un grupo de semáforos binarios $b_1, \dots, b_n$ conforman un SBS si mantienen el invariante global de que su suma total es a lo sumo 1 ($0 \le b_1 + \dots + b_n \le 1$). Proveen exclusión mutua implícita entre los bloques que están delimitados por `P` de uno de los semáforos y el `V` de otro distinto del SBS.
* **Buffer Unitario:** Un productor y un consumidor alternan usando `sem vacio = 1, lleno = 0;`.
  * Productor: `P(vacio); buffer = dato; V(lleno);`
  * Consumidor: `P(lleno); resultado = buffer; V(vacio);`

### Buffers Limitados (Contadores de Recursos)
Se usan semáforos generales para administrar arreglos circulares de tamaño $N$.
* `sem vacio = N, lleno = 0;` (Contadores lógicos).
* Cuando existen **múltiples** productores y/o **múltiples** consumidores, los punteros compartidos de escritura (`libre`) y lectura (`ocupado`) deben protegerse de condiciones de carrera mediante exclusión mutua, introduciendo `sem mutexD = 1` y `sem mutexR = 1`.

### Los Filósofos Comensales (Exclusión Mutua Selectiva)
Varios procesos compiten de forma cíclica por recursos superpuestos (los tenedores).
* Si cada filósofo ejecuta `P(tenedor[i])` (toma el izquierdo) e inmediatamente `P(tenedor[i+1])` (toma el derecho), puede ocurrir **Deadlock** si todos toman su tenedor izquierdo simultáneamente.
* Soluciones típicas implican romper la simetría o restringir el número de comensales.

### Lectores y Escritores
* **Condiciones:** Los lectores pueden acceder concurrentemente a la BD, pero si un escritor accede, debe hacerlo bajo exclusión mutua total.
* **Prioridad/Fairness:** Dependiendo de las variables auxiliares, la solución puede derivar en dar excesiva prioridad a los lectores, generando inanición para los escritores, y viceversa. Requiere un control cuidadoso.

## 4. Técnica "Passing the Baton" (Pasar el Testimonio)
Es una técnica de programación concurrente generalizada para implementar sentencias `< await (B) S; >` muy complejas (como lectores/escritores justos o planificadores de recursos).
* Se basa en que cuando un proceso entra a una SC controlada por un SBS general, mantiene un "baton" o testimonio, indicando que es el único con control en esa sección.
* Antes de salir (bloque `SIGNAL`), revisa si hay otros procesos esperando (`d_j > 0`) cuyas condiciones (`B_j`) ya se cumplen.
* Si es así, no libera el candado principal (`V(e)`), sino que transfiere el permiso de ejecución directamente al proceso bloqueado despertando su **semáforo privado** (`V(b_j)`).
* Si nadie cumple su condición o no hay bloqueados, devuelve el baton a la "puerta" general (`V(e)`).

### Alocación Shortest-Job-Next (SJN) y Scheduling
Ejemplo paradigmático del Passing the Baton. Los procesos solicitan acceso a un recurso reportando un tiempo estimado.
* `request(tiempo, id)`: Si el recurso está libre, lo toma. Si está ocupado, el proceso se inserta en una lista `Pares` (ordenada o por recorrer) y queda bloqueado en su semáforo privado (`P(b[id])`).
* `release()`: Al liberar el recurso, el proceso evalúa la lista `Pares`. Remueve el proceso bloqueado que solicitó menos tiempo (SJN) y le cede la ejecución directamente haciendo `V(b[id_menor])`.
