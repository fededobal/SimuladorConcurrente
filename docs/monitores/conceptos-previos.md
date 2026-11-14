
# Conceptos previos de concurrencia

Resumen de los conceptos de concurrencia, sincronización por variables compartidas, *locks* y barreras que la cátedra presenta en las teorías 1 y 2, sin semáforos. Es el contexto en el que aparecen los monitores; el simulador no implementa las construcciones de esta página (`co ... oc`, `< await >`, *spin locks*, barreras), que se incluyen solo como referencia.

## 1. Introducción a la Concurrencia
* **Concurrencia:** Capacidad de ejecutar múltiples actividades en paralelo o simultáneamente. No está restringido a una arquitectura de hardware particular ni a un número determinado de procesadores.
* **Paralelismo:** Ejecución concurrente en múltiples procesadores con el objetivo principal de reducir el tiempo de ejecución.
* **Procesamiento secuencial vs. concurrente vs. paralelo:**
  * Secuencial: Estricto orden temporal.
  * Concurrente (sin hardware paralelo): Intercalado (time slicing) en un único procesador.
  * Paralelo: Múltiples unidades de procesamiento ejecutando tareas simultáneamente.
* **Procesos e Hilos (Threads):**
  * **Procesos:** Tienen su propio espacio de direcciones y recursos.
  * **Hilos:** Comparten el mismo espacio de direcciones y recursos dentro de un proceso.
* **Comportamientos de los procesos:**
  * **Independientes:** Raros y poco interesantes.
  * **Competencia:** Compiten por recursos (típico en SO). Pueden generar *Deadlocks* (abrazo mortal) o *Inanición* (starvation).
  * **Cooperación:** Se combinan para resolver una tarea. Requieren sincronización y comunicación.

## 2. Comunicación y Sincronización
* **Comunicación:**
  * **Memoria Compartida:** Intercambian información sobre variables en memoria común. Requiere acceso protegido.
  * **Pasaje de Mensajes:** Canal lógico o físico (ej. send/receive).
* **Sincronización:**
  * **Por Exclusión Mutua:** Asegura que solo un proceso tenga acceso a un recurso compartido a la vez.
  * **Por Condición:** Bloquea un proceso hasta que se cumpla una condición dada.
* **Interferencia:** Cuando un proceso realiza una acción que invalida las suposiciones de otro proceso sobre el estado de las variables.

## 3. Sentencias Concurrentes y Acción Atómica
* **Creación de procesos:**
  * `co ... oc`: Las ramas internas se ejecutan concurrentemente y el flujo principal espera a que terminen todas para continuar.
  * `process`: Instancia procesos que se ejecutan de manera independiente en background. 
  * **Arreglos de Procesos (Familias):** Como se observa en algoritmos de múltiples *workers* o en la barrera *Butterfly*, se pueden crear múltiples procesos idénticos de forma compacta utilizando cuantificadores. Las sintaxis aceptadas en la teoría son `process Nombre[id = N to M]`, `process Nombre[id: N..M]` o `process Nombre[id=N..M]`. Esto instancia un arreglo de procesos concurrentes donde cada uno recibe un identificador local único (por ejemplo, `i` o `id`).
* **Acción Atómica:** Transformación de estado indivisible.
  * **Grano Fino:** Implementada por hardware (ej. lectura/escritura básica de variables simples).
  * **Propiedad "A lo sumo una vez" (ASV):** Una asignación o expresión `x = e` parece atómica si contiene a lo sumo una referencia crítica (a una variable compartida modificada por otro) y `x` no es referenciada por otro proceso.
* **Grano Grueso (Sincronización explícita):**
  * `< S; >`: Especifica que la sentencia `S` debe evaluarse de forma atómica incondicional.
  * `< await (B) S; >`: Sincronización condicional. Espera a que `B` sea verdadera y luego ejecuta `S` de forma atómica e indivisible.

## 4. Propiedades y Fairness (Justicia)
* **Seguridad (Safety):** "Nada malo ocurre". Ej. exclusión mutua, ausencia de interferencia. Garantizan estados consistentes.
* **Vida (Liveness):** "Eventualmente ocurre algo bueno". Ej. terminación, eventual entrada. Garantizan el progreso.
* **Fairness en Scheduling:**
  * **Incondicional:** Toda acción elegible incondicional se ejecuta eventualmente.
  * **Débil:** Toda acción condicional elegible se ejecuta asumiendo que su condición se vuelve verdadera y *permanece* verdadera.
  * **Fuerte:** Toda acción condicional elegible se ejecuta si su condición se vuelve verdadera *con infinita frecuencia* (aunque a veces vuelva a ser falsa).

## 5. El Problema de la Sección Crítica (SC)
Para proteger variables compartidas, se requieren protocolos de entrada y salida que satisfagan 4 propiedades:
1. **Exclusión mutua:** A lo sumo un proceso está en la SC.
2. **Ausencia de Deadlock:** Si varios procesos intentan entrar, al menos uno tendrá éxito.
3. **Ausencia de Demora Innecesaria:** Un proceso no debe ser impedido de entrar si no hay nadie más en la SC.
4. **Eventual Entrada (No inanición):** Un proceso que intenta entrar eventualmente lo hará (depende del scheduler).

### Soluciones por Busy Waiting (Espera Activa)
* **Spin Locks:** Uso de instrucciones atómicas de hardware como `Test-and-Set (TS)` o `Fetch-and-Add (FA)`.
  * *Spin Lock Simple:* `while (TS(lock)) skip;` (Causa alta contención de memoria).
  * *Test-and-Test-and-Set:* `while (lock) skip; while (TS(lock)) while (lock) skip;` (Reduce la contención leyendo desde caché hasta que lock pase a false).
* **Algoritmo Tie-Breaker:** Solución de software puro de 2 a N procesos. Utiliza un arreglo para definir en qué "etapa" del protocolo de entrada está cada proceso y una variable `ultimo` para romper los empates obligando al último en llegar a esperar.
* **Algoritmo Ticket:** Emplea un ticket (`numero` atómico incrementado con `FA`) y un visor del turno actual (`proximo`). Es justo (FCFS), pero requiere hardware especial para el `FA` o proteger la obtención del número.
* **Algoritmo Bakery (Panadería):** Los procesos observan los turnos de los demás y se asignan a sí mismos un número mayor que el máximo actual. Descentralizado y justo, sin requerir instrucciones especiales, simulando el comportamiento de una panadería.

## 6. Sincronización Barrier (Barreras)
Punto de sincronización donde todos los procesos de un grupo deben llegar antes de que se les permita continuar.
* **Contador Compartido:** Usa una variable atómica incrementada con `FA`. Ineficiente por cuellos de botella de memoria si N es grande.
* **Flags y Coordinadores:** Un proceso coordinador verifica un arreglo de llegadas (`arribo[i]`) y luego levanta las barreras usando un arreglo de continuación (`continuar[i]`).
* **Barreras Combinadas (Árbol y Simétricas / Butterfly):**
  * Para evitar cuellos de botella, se construyen árboles de sincronización.
  * En una Barrera *Butterfly* (N debe ser potencia de 2), se requieren log₂(N) etapas. En cada etapa, cada proceso sincroniza con un proceso distinto a distancia 2^(s-1). Al finalizar las etapas, todos pueden continuar.