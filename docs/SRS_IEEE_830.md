# Especificación de Requisitos de Software (SRS) — IEEE 830
## Proyecto: Simulador de Monitores (UNLP)

---

## 1. Introducción

### 1.1 Propósito
Definir los requisitos de software del **Simulador de Monitores**, una herramienta de apoyo
para la enseñanza de sincronización con monitores en la materia Programación Concurrente
(Facultad de Informática, UNLP). Dirigido a desarrolladores, docentes y a futuros alumnos que
continúen el proyecto.

### 1.2 Alcance
El sistema permite escribir pseudocódigo con **monitores** y **variables condición**,
compilarlo y ejecutarlo de forma no determinística —paso a paso o completa— visualizando la
exclusión mutua implícita, las colas de las variables condición, la cola de entrada a cada
monitor y el avance de cada proceso. Es un **prototipo**: base para una versión de cátedra o
para una tesina de Licenciatura.

Queda **fuera de alcance** en esta versión: semáforos, disciplina *signal and wait*, `wait`
con prioridad, verificación automática de las 4 propiedades de la sección crítica, y
persistencia de simulaciones.

### 1.3 Definiciones
- **Monitor:** módulo que encapsula un recurso compartido; sus procedures se ejecutan bajo
  exclusión mutua implícita.
- **Variable condición (cond):** cola de procesos demorados; se opera con `wait`, `signal`,
  `signal_all`.
- **Signal and Continue:** disciplina de señalización en la que el proceso que hace `signal`
  conserva el monitor y el despertado compite por reingresar.
- **Instante:** paso atómico de la simulación; en cada instante avanza un proceso una sentencia.
- **VM:** máquina virtual que interpreta el AST.
- **Snapshot:** fotografía completa del estado en un instante (para el *time-travel*).

### 1.4 Referencias
- `docs/monitores.md` — teoría de monitores de la cátedra.
- `docs/sintaxis_especificacion.md` — sintaxis, semántica y gramática EBNF.

---

## 2. Descripción general

### 2.1 Perspectiva del producto
Aplicación **cliente-servidor**:

- **Backend (núcleo + API):** Java 21 / Spring Boot. Contiene el lexer, el parser, el
  validador semántico y la máquina virtual de monitores, más una API REST que crea
  simulaciones y las hace avanzar. El estado vive en memoria (sin base de datos).
- **Frontend:** React / TypeScript / Vite. Editor de código, panel de monitores, lista de
  procesos, línea de tiempo e historial de eventos. Consume la API REST; implementa la
  "ejecución completa" (bucle de pasos) y el *time-travel* del lado del cliente.

### 2.2 Funciones del producto
- Edición de pseudocódigo con resaltado de sintaxis.
- Compilación: texto → AST validado, o error con número de línea.
- Simulación no determinística: política **aleatoria** o **round-robin**; en modo paso a paso
  el usuario elige qué proceso ejecuta el próximo instante.
- Ejecución paso a paso y completa (con velocidad configurable).
- Visualización en vivo: variables permanentes de cada monitor, colas de las variables
  condición, cola de entrada, dueño del lock, estado y ubicación de cada proceso.
- Línea de tiempo horizontal instante a instante (estilo diagrama de Gantt).
- *Time-travel* de solo lectura: al pasar el mouse por un evento o una celda de la línea de
  tiempo se muestra el estado de ese instante.
- Detección de **deadlock** de ejecución.
- Codificación por color de cada proceso.

### 2.3 Usuarios
- **Estudiantes:** cursan Programación Concurrente; aprenden monitores y sus problemas.
- **Docentes:** dan ejemplos en vivo, muestran interleavings.
- **Desarrolladores:** mantienen y extienden la herramienta (TypeScript, Java, diseño de
  intérpretes).

### 2.4 Restricciones
- Backend ejecutable con JDK 21+ y Maven; frontend con Node 20+.
- El lenguaje sigue estrictamente la notación de monitores de la cátedra (`docs/monitores.md`).
- Disciplina de señalización única: *signal and continue*.

---

## 3. Requisitos específicos

### 3.1 Interfaces externas
- **UI:** paneles redimensionables — Código, Monitores, Procesos (arriba); Línea de tiempo,
  Historial (abajo). Controles: Ejecutar/Continuar, Pausar, Paso, Reiniciar, Detener,
  selector de política y de velocidad, indicador de estado e instante actual.
- **API REST:** `POST /api/simulations`, `POST /api/simulations/{id}/step`,
  `POST /api/simulations/{id}/reset`, `GET /api/simulations/{id}`,
  `DELETE /api/simulations/{id}`. Errores de compilación → `400 {error, line}`.

### 3.2 Requisitos funcionales

#### 3.2.1 Núcleo del lenguaje
- **RF1.1** El lexer reconoce las palabras reservadas del lenguaje de monitores (`monitor`,
  `procedure`, `cond`, `process`, `wait`, `signal`, `signal_all`, `in`, `out`, `inout`,
  control de flujo y tipos) y rechaza con mensaje claro las de la versión de semáforos
  (`sem`, `await`).
- **RF1.2** El parser genera un AST tipado o lanza un error con número de línea.
- **RF1.3** El validador semántico verifica: nombres declarados y su alcance (los locales de
  un `process` no son visibles dentro de un monitor), existencia de monitor/procedure/cond,
  aridad de las llamadas, argumentos `out`/`inout` ligados a lvalues asignables, `wait`/
  `signal` solo dentro de procedures, y prohibición de asignar a constantes globales.
- **RF1.4** Se soportan familias de procesos: `process Nombre[i: a..b]`.

#### 3.2.2 Máquina virtual
- **RF2.1** La VM administra procesos (con pila de activaciones), monitores (variables
  permanentes, variables condición, lock y cola de entrada) y constantes globales.
- **RF2.2** En cada instante avanza **un** proceso **una** sentencia. El proceso lo elige el
  usuario o la política (`RANDOM` / `ROUND_ROBIN`).
- **RF2.3** Exclusión mutua implícita: a lo sumo un proceso ejecuta dentro de cada monitor.
  Un proceso que llama con el monitor ocupado queda en la cola de entrada.
- **RF2.4** Variables condición con disciplina *signal and continue*: `wait` siempre demora
  y libera el monitor; `signal` mueve al primero de la cola a competir por el monitor (no-op
  si la cola está vacía); `signal_all` mueve a todos. Al liberarse el lock, la cola de
  entrada completa vuelve a competir.
- **RF2.5** Estados de proceso: `READY`, `RUNNING`, `BLOCKED` (con motivo: entrada a monitor
  o espera en cond) y `TERMINATED`.
- **RF2.6** Parámetros `out`/`inout`: al retornar el procedure, el valor se copia al
  argumento del llamador.
- **RF2.7** Detección de deadlock: si no hay ningún proceso listo y no todos terminaron, se
  informa el interbloqueo.
- **RF2.8** Cada instante genera un evento con un snapshot completo del estado.

#### 3.2.3 Tipos de datos
- **RF3.1** `int`, `double`, `boolean`, `text` y arreglos de estos.
- **RF3.2** Tipo `Cola` (FIFO) con `push`, `pop` y `empty`.
- **RF3.3** Las variables locales de un proceso o procedure no contaminan el estado global.

#### 3.2.4 Interfaz y depuración
- **RF4.1** El historial registra cada evento con el color del proceso y su instante.
- **RF4.2** *Time-travel*: al posar el mouse sobre un evento o celda de la línea de tiempo,
  todos los paneles reflejan el estado exacto de ese instante.
- **RF4.3** El panel de monitores muestra, por monitor: dueño del lock, variables
  permanentes (con autoría del último cambio), colas de cada variable condición y cola de
  entrada.
- **RF4.4** La línea de tiempo muestra, por proceso e instante, si estaba ejecutando
  (color del proceso), bloqueado (ocre) o listo.
- **RF4.5** El editor pasa a solo lectura mientras hay una simulación activa.

### 3.3 Requisitos no funcionales
- **RNF1** La compilación de programas típicos (< 1000 líneas) demora < 100 ms.
- **RNF2** La UI no debe bloquearse durante ejecuciones largas o bucles infinitos (la VM
  corta las esperas activas por instante con un tope de iteraciones estructurales).
- **RNF3** El núcleo se prueba con JUnit de forma aislada del framework web.
- **RNF4** Código fuente en TypeScript estricto y Java moderno, estructurado para facilitar
  extensiones (nuevas construcciones del lenguaje, nuevas vistas).
- **RNF5** Compatibilidad con navegadores modernos (Chrome, Firefox, Safari, Edge).

### 3.4 Restricciones de diseño
- El núcleo (`backend/.../lang` y `.../vm`) no depende de Spring.
- El frontend usa React funcional con Hooks.
- Los DTOs de la API son `record` de Java serializados como JSON.
