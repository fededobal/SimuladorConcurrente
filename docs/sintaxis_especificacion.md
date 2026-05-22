# Especificación de Sintaxis y Semántica: Simulador Concurrente

**Contexto para el Agente (Antigravity):** Este documento define la totalidad de las estructuras, tipos de datos, operaciones y reglas gramaticales que el parser y el motor de ejecución del simulador deben soportar. El lenguaje es un pseudocódigo tipado de estilo C, diseñado específicamente para la enseñanza de Programación Concurrente (Memoria Compartida).

---

## 1. Estructura General del Programa
El código fuente se divide en dos secciones lógicas implícitas:
1.  **Zona de Declaración Global:** Donde se definen variables compartidas y semáforos. Todo lo declarado fuera de un proceso es global y accesible por cualquier hilo.
2.  **Zona de Procesos:** Definición de los bloques `process` que contienen el código secuencial que ejecutará cada hilo.

**Comentarios:**
* De una línea: `// comentario`
* Multilínea: `/* comentario */`

---

## 2. Tipos de Datos Primitivos y Variables Compartidas
El analizador debe reconocer los siguientes tipos de datos y permitir su asignación en la zona global o local.

### Primitivos
* `int`: Números enteros. Ej: `int contador = 0;`
* `boolean`: Valores de verdad (`true` o `false`). Ej: `boolean flag = true;`
* `text`: Cadenas de texto. Ej: `text mensaje = "Iniciando";`

### Arreglos (Arrays)
Se debe soportar la declaración de arreglos estáticos y su inicialización masiva o por defecto.
* **Sintaxis:** `tipo nombre[tamaño];` o `tipo nombre[tamaño] = ([tamaño] valor_inicial);`
* **Ejemplos:**
    * `int buffer[10];` (Arreglo de 10 enteros no inicializado).
    * `int valores[5] = ([5] 0);` (Arreglo de 5 enteros, todos inicializados en 0).
* **Acceso:** Lectura/escritura mediante índice base 0. Ej: `buffer[0] = 1;` o `x = buffer[i];`

---

## 3. Semáforos (Sincronización)
El motor de ejecución debe manejar los semáforos como un tipo de dato especial con estado interno (contador y cola de bloqueados asociada).

### Declaración
* **Semáforo simple:** `sem nombre = valor_inicial;` (Ej: `sem mutex = 1;`)
* **Arreglo de semáforos:** `sem nombre[tamaño] = ([tamaño] valor_inicial);` (Ej: `sem tenedores[5] = ([5] 1);`). Tambien se pueden declarar semaforos sin inicializar simplemente con `sem nombre[tamaño]` 

### Operaciones
Las operaciones atómicas estándar de Dijkstra deben ser interceptadas por el Scheduler del simulador.
* `P(semáforo)`: Decrementa el contador. Si el valor resultante es `< 0`, el hilo actual cambia su estado a `BLOCKED` y entra en la cola del semáforo. La CPU pasa a otro hilo.
* `V(semáforo)`: Incrementa el contador. Si el valor es `<= 0` (lo que implica que hay hilos esperando), saca al primer hilo de la cola (política FIFO) y lo pasa a estado `READY`.
* **Soporte para arreglos:** Debe soportar operaciones indexadas. Ej: `P(tenedores[i]);` o `V(tenedores[(i+1)%5]);`

---

## 4. Estructuras de Datos Complejas: Colas (Queues)
El simulador debe incluir una estructura `Cola` nativa, frecuentemente utilizada en modelos de Productor/Consumidor.

### Declaración y Uso
* **Declaración:** `Cola nombre;` (Ej: `Cola buffer;`)
* **Métodos nativos requeridos:**
    * `push()`: Inserta un elemento al final de la cola. Por ejemplo: `push(buffer,elemento)`
    * `pop()`: Retira y retorna el primer elemento de la cola. Puede asignarse a una variable. Ej: `pop(buffer,x);`
    * `empty buffer`: Retorna un booleano `true` si la cola no tiene elementos o sino `false`.

---

## 5. Estructuras de Control
El código interno de los procesos debe soportar anidamiento de las siguientes estructuras de control estándar.

### Condicionales
```c
if (condicion) {
    // sentencias
} else {
    // sentencias
}
```

### Bucles
**While:**
```c
while (condicion) {
    // sentencias
}
```

**For:**
```c
for (int i = 0; i < N; i = i + 1) {
    // sentencias
}
```
*Nota para el parser: Permitir sintaxis de incremento acortada como `i++` o `i += 1` si es posible.*

---

## 6. Declaración de Procesos (Hilos)
El motor debe parsear los procesos para convertirlos en los hilos (Threads) que manejará el Scheduler.

### Proceso Único
Define un único hilo en el simulador.
```c
process NombreProceso {
    // Código local e interacciones
}
```

### Arreglo de Procesos (Procesos Parametrizados)
Fundamental para simular concurrencia masiva (ej: 5 filósofos, N lectores). El parser debe instanciar múltiples hilos basados en el rango definido, inyectando la variable de iteración como contexto local.
* **Sintaxis requerida:** `process Nombre[variable : inicio..fin]`
* **Ejemplo:**
```c
process Filosofo[id: 0..4] {
    while (true) {
        P(tenedores[id]);
        P(tenedores[(id + 1) % 5]);
        // Comer
        V(tenedores[id]);
        V(tenedores[(id + 1) % 5]);
    }
}
```
*El Scheduler debe generar 5 hilos (Filosofo 0, Filosofo 1, ..., Filosofo 4), cada uno con su variable local `id` constante.*

---

## 7. Variables Locales
Cualquier variable declarada dentro del bloque `{ }` de un proceso (`int x = 0;`) debe existir únicamente en el contexto (Stack) de ese hilo específico y no debe ser visible en el panel de "Variables Compartidas" del frontend, salvo que la UI tenga una vista específica para el estado interno del hilo activo.