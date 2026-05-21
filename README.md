# Simulador Concurrente (UNLP)

[![React](https://img.shields.io/badge/React-19.2-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0-purple.svg)](https://vitejs.dev/)

Un entorno interactivo de desarrollo y simulación en el navegador diseñado para la materia **Programación Concurrente** de la Facultad de Informática (UNLP). 

Este simulador permite a los estudiantes escribir, compilar y ejecutar pseudocódigo concurrente paso a paso, visualizando de forma gráfica y reactiva el entrelazado de hilos, las condiciones de carrera y la evolución de las variables compartidas y semáforos.

## ✨ Características Principales

* **Motor de Simulación a Medida:** Un analizador léxico/sintáctico (Parser) y una Máquina Virtual (VM) construidos desde cero en TypeScript para interpretar estrictamente la sintaxis de la cátedra.
* **Soporte Extenso de Sintaxis:**
    * Comandos guardados de Dijkstra (`if-fi`, `do-od`).
    * Sentencias iterativas cuantificadas (`fa-af`).
    * Hilos independientes (`process`) y bifurcación estructurada (`co-oc`).
    * Primitivas de sincronización (`<await(B) S>`, `P()`, `V()`).
    * Tipos abstractos como arreglos y Semáforos (`sem`).
* **Time-Travel Debugger:** Permite pausar la ejecución y hacer *hover* sobre el log histórico de eventos (Scheduler) para ver una "fotografía" exacta del estado de la memoria en el pasado.
* **Visualización Estructural de Semáforos:** Los semáforos se muestran como Tipos de Datos Abstractos completos, separando visualmente el valor del contador y la cola estricta de procesos bloqueados.
* **Color-Coding de Hilos:** Cada proceso instanciado recibe una identidad cromática, permitiendo rastrear visualmente qué hilo mutó qué variable en la memoria compartida.

## 🚀 Inicio Rápido

### Prerrequisitos
Asegúrate de tener instalado [Node.js](https://nodejs.org/) (versión 18+ recomendada) y `npm` (o `yarn`/`pnpm`).

### Instalación

1.  Clona el repositorio:
    ```bash
    git clone https://github.com/tu-usuario/SimuladorConcurrente.git
    cd SimuladorConcurrente
    ```
2.  Instala las dependencias:
    ```bash
    npm install
    ```
3.  Inicia el servidor de desarrollo (Vite):
    ```bash
    npm run dev
    ```
4.  Abre tu navegador en `http://localhost:5173`.

## 📚 Documentación de Referencia

Dentro del directorio `/docs` encontrarás especificaciones fundamentales para entender el comportamiento del motor y el código que los alumnos deben utilizar:
* [**`EBNF_sintaxis.md`**](./docs/EBNF_sintaxis.md): La gramática extendida de Backus-Naur que rige el analizador sintáctico del simulador.
* [**`conceptos_concurrencia.md`**](./docs/conceptos_concurrencia.md): Resumen teórico de los conceptos de paralelismo, locks y barreras aplicables en el motor.
* [**`semaforos.md`**](./docs/semaforos.md): Especificación sobre el comportamiento de los semáforos, *Split Binary Semaphores* y técnicas avanzadas como *Passing the Baton*.

## 🛠️ Arquitectura del Proyecto

* **`src/engine/`**: El núcleo del simulador.
    * `lexer.ts`: Tokenizador de expresiones regulares simples.
    * `parser.ts`: Analizador sintáctico descendente recursivo (Recursive Descent Parser) que genera el AST (Abstract Syntax Tree).
    * `vm.ts`: Motor de evaluación no determinístico. Controla el *scheduler* aleatorio, resuelve variables locales vs. globales e implementa la semántica de bloqueos.
* **`src/components/`**: Interfaz de usuario React.
    * `CodeEditor.tsx`: Editor de texto enriquecido con control de indentación automático y sincronización de números de línea.
    * `VariableTracker.tsx`: Visor reactivo de tarjetas (cards) que muestra el estado de la memoria global y las colas de semáforos.
    * `LogViewer.tsx`: Historial cronológico de cambios de estado y bifurcaciones.