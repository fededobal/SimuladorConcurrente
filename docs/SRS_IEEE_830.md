# Especificación de Requisitos de Software (SRS) - IEEE 830
## Proyecto: Simulador Concurrente (UNLP)

---

## 1. Introducción

### 1.1 Propósito
El propósito de este documento es definir las especificaciones de requisitos de software (SRS) para el proyecto **Simulador Concurrente (UNLP)**, siguiendo el estándar IEEE 830. El documento provee una descripción detallada sobre las funcionalidades, rendimiento, interfaces y restricciones de diseño del simulador. Está dirigido tanto a los desarrolladores del sistema como a los docentes y alumnos de la materia de Programación Concurrente.

### 1.2 Alcance
El producto de software, denominado *Simulador Concurrente*, es un entorno interactivo de desarrollo y simulación que se ejecuta íntegramente en el navegador web. Su objetivo es permitir a los estudiantes de la Facultad de Informática de la UNLP escribir, compilar y ejecutar pseudocódigo concurrente paso a paso. El sistema abarca:
- Un editor de código integrado.
- Un analizador léxico y sintáctico (Parser) a medida.
- Una Máquina Virtual (VM) para interpretar y ejecutar concurrentemente el pseudocódigo, simulando el entrelazado real de hilos (Scheduler).
- Herramientas visuales de depuración (*Time-Travel Debugger*).
- Representaciones visuales de la memoria compartida y estructuras como los Semáforos.

### 1.3 Definiciones, Acrónimos y Abreviaturas
- **AST:** *Abstract Syntax Tree* (Árbol de Sintaxis Abstracta).
- **VM:** *Virtual Machine* (Máquina Virtual).
- **Scheduler:** Planificador de hilos encargado de definir el orden de ejecución (simulando no determinismo).
- **Time-Travel Debugger:** Funcionalidad que permite retroceder o avanzar en los pasos de la ejecución para observar el estado de la memoria en instantes anteriores.
- **P / V:** Operaciones de semáforos (*Proberen/Wait* y *Verhogen/Signal*).
- **SBS:** *Split Binary Semaphore* (Semáforo Binario Dividido).
- **UI:** Interfaz de Usuario.

### 1.4 Referencias
- *EBNF_sintaxis.md*: Gramática extendida de Backus-Naur del lenguaje.
- *conceptos_concurrencia.md*: Resumen teórico de paralelismo, locks y barreras.
- *semaforos.md*: Especificación del comportamiento de semáforos en la cátedra.
- *sintaxis_especificacion.md*: Especificación de Sintaxis y Semántica.

### 1.5 Descripción General
El documento se estructura en dos partes principales adicionales: la Sección 2 ofrece una descripción general del producto, la perspectiva, las funciones y los perfiles de usuario; y la Sección 3 detalla de forma exhaustiva los requisitos específicos funcionales y no funcionales del motor y la interfaz visual.

---

## 2. Descripción General

### 2.1 Perspectiva del Producto
El Simulador Concurrente es una aplicación Web *Single-Page Application* (SPA) independiente, que no requiere de un servidor backend en tiempo real para ejecutar el código, ya que la evaluación (parsing y VM) se realiza íntegramente en el entorno del cliente (navegador) utilizando TypeScript. Se enmarca como una herramienta de apoyo académico.

### 2.2 Funciones del Producto
Las principales funciones del software son:
- **Edición de Código:** Un editor de texto con control de indentación automático y sincronización de números de línea.
- **Análisis Sintáctico y Compilación:** Generación de un AST a partir de un pseudocódigo tipado (C-like) que soporta sentencias como `if-fi`, `do-od`, `fa-af`, bifurcación `co-oc` y la directiva `process`.
- **Simulación de Ejecución Concurrente:** Una VM que maneja múltiples hilos simulados y su intercalado aleatorio mediante un scheduler interno.
- **Gestión de Memoria y Estado:** Soporte para memoria compartida, variables locales por hilo, y tipos estructurados como Arreglos y Semáforos (con colas FIFO estables).
- **Inspección Visual (Debugger):** Visualización interactiva y reactiva en forma de tarjetas (cards) de la evolución de las variables, colas y bloqueos. Soporte para explorar "fotografías" de estados pasados del programa (Time-Travel).
- **Codificación de Colores:** Asignación de identidades cromáticas a cada proceso para observar la autoría de las mutaciones en memoria.

### 2.3 Características de los Usuarios
- **Estudiantes (Usuarios Principales):** Alumnos cursando Programación Concurrente. Poseen nociones básicas de algoritmia y programación imperativa, pero están en etapa de aprendizaje de concurrencia y sus problemas subyacentes (deadlocks, inanición, condiciones de carrera).
- **Docentes:** Profesores y ayudantes de la cátedra que utilizan el simulador para dar ejemplos en vivo o evaluar lógicas de resolución.
- **Desarrolladores:** Personas con conocimientos en TypeScript, React y diseño de compiladores encargadas del mantenimiento de la herramienta.

### 2.4 Restricciones
- **Restricciones de Entorno:** Debe ser 100% ejecutable en navegadores web modernos (Chrome, Firefox, Safari, Edge).
- **Lenguaje:** Estricto apego a la gramática y el pseudocódigo definido por la cátedra en sus materiales.

### 2.5 Suposiciones y Dependencias
- Se asume que el usuario accede desde una pantalla con resolución de PC/Laptop para visualizar correctamente los distintos paneles (Editor, Log, y Memoria).
- Dependencias de librerías base: Node.js (v18+), React v19.2, TypeScript v6.0 y Vite v8.0.

---

## 3. Requisitos Específicos

### 3.1 Interfaces Externas
- **Interfaz de Usuario (UI):**
  - Panel principal dividido vertical/horizontalmente: a la izquierda, el **Editor de Código** (`CodeEditor.tsx`); a la derecha, el **Visor de Memoria/Semáforos** (`VariableTracker.tsx`); debajo, el **Historial de Ejecución** (`LogViewer.tsx`).
  - Botones de control de flujo de simulación: "Compilar", "Paso a paso (Step)", "Pausar", "Reiniciar".
- **Interfaces de Software:** Uso del motor V8 (o equivalente del navegador) para ejecutar el loop del intérprete. No existen dependencias a bases de datos ni servicios externos de computación en la nube.

### 3.2 Funciones (Requisitos Funcionales)

#### 3.2.1 Motor de Análisis (Parser y Lexer)
- **RF1.1:** El analizador léxico debe reconocer las palabras reservadas (`process`, `co`, `oc`, `if`, `fi`, `do`, `od`, `fa`, `af`, `sem`, `Cola`, etc.) y primitivas de sincronización (`<await(B) S>`, `P()`, `V()`).
- **RF1.2:** El parser debe validar la sintaxis según la EBNF de la cátedra y generar un Árbol de Sintaxis Abstracta (AST) o lanzar un error descriptivo con número de línea.
- **RF1.3:** Debe permitirse la declaración de arreglos estáticos de procesos (ej: `process Filosofo[id: 0..4]`).

#### 3.2.2 Máquina Virtual y Scheduler (VM)
- **RF2.1:** La VM debe administrar un conjunto de procesos instanciados (Stack por hilo) y un espacio global de variables compartidas.
- **RF2.2:** El Scheduler debe decidir no determinísticamente qué hilo en estado `READY` se ejecutará en cada *tick* (instrucción atómica).
- **RF2.3:** Se deben soportar acciones atómicas condicionales incondicionales de grano grueso (ej. `< S; >` y `< await (B) S; >`).
- **RF2.4:** Los hilos deben cambiar de estado entre `READY`, `RUNNING`, `BLOCKED` (ej. al hacer `P` a un semáforo vacío o `<await>` falso) y `TERMINATED`.

#### 3.2.3 Manejo de Tipos de Datos y Sincronización
- **RF3.1:** El motor debe soportar `int`, `boolean`, `text`, y arreglos de estos tipos (`[]`).
- **RF3.2:** Se deben soportar semáforos (`sem`) como un TDA con un contador entero y una cola FIFO estricta.
- **RF3.3:** El simulador debe soportar el uso del TDA `Cola` con sus métodos nativos `push()`, `pop()` y validación `empty`.
- **RF3.4:** Las variables declaradas localmente dentro del `process` no deben contaminar el estado global, sino aislarse en el registro de la variable del hilo en ejecución.

#### 3.2.4 Interfaz y Debugging Visual
- **RF4.1:** El log cronológico (LogViewer) debe registrar cada instrucción con el color de su respectivo hilo.
- **RF4.2 (Time-Travel):** Al hacer *hover* sobre una instrucción pasada del log, la visualización de la memoria global debe reflejar fielmente los valores exactos en dicho instante temporal (fotografía de estado).
- **RF4.3:** La representación gráfica de los semáforos debe mostrar de forma dividida el valor actual de su contador y el listado claro de hilos insertados en su cola de bloqueo.

### 3.3 Requisitos de Rendimiento
- La compilación del código desde texto plano a AST debe demorar menos de 100 milisegundos en escenarios típicos (archivos menores a 1000 líneas).
- El simulador no debe bloquear el *main thread* del navegador permanentemente; el motor debe ceder el control mediante funciones asíncronas para mantener la interfaz web responsiva durante ciclos infinitos o loops muy costosos.
- El *Time-Travel Debugger* debe almacenar los historiales de estado ocupando un volumen de memoria razonable (optimizando la copia de estado global para no superar los límites tabulados del *heap* de JS).

### 3.4 Restricciones de Diseño
- Todo el código que involucra parser y VM se implementará bajo un enfoque funcional/orientado a objetos de manera aislada dentro de `src/engine/` para facilitar sus correspondientes tests unitarios, independiente del framework React (`src/components/`).
- El frontend debe construirse exclusivamente usando React funcional, con Hooks.

### 3.5 Atributos del Sistema de Software
- **Mantenibilidad:** El código fuente debe estar escrito en TypeScript estricto, facilitando la validación estática y las futuras extensiones de sintaxis (ej. nuevos comandos EBNF).
- **Usabilidad:** La UI debe indicar claramente cuando existe un interbloqueo o Deadlock de forma visual, por ejemplo alertando que "Todos los procesos se encuentran BLOCKED o TERMINATED".
- **Portabilidad:** Compatibilidad garantizada en cualquier entorno que soporte un navegador web con ES6+, sin instalaciones adicionales en el SO subyacente.
