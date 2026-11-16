---
name: convenciones-codigo
description: >
  Convenciones de programación del simulador para Java (núcleo) y TypeScript/React
  (interfaz): idioma de identificadores y textos, nombres, estructura, manejo de errores,
  determinismo, tamaño de clases y métodos, tests y estilo. Usala SIEMPRE antes de
  escribir o modificar código en este repositorio, aunque el cambio sea chico, y al
  revisar código generado por otro agente. Si una convención choca con un pedido del
  usuario, señalalo antes de apartarte.
---

# Convenciones de código

Objetivo: que cualquier archivo parezca escrito por la misma persona, sea quien sea (Fede,
un compañero o un agente). Ante la duda, imitar el código vecino **si** cumple estas
reglas; si no las cumple, no propagar el problema.

Detalle por lenguaje: `references/java.md` (núcleo) y `references/typescript.md` (interfaz).
Leer el que corresponda antes de escribir.

## Reglas comunes

**Idioma**
- Identificadores (clases, métodos, variables, tipos): **inglés técnico**. Excepción: las
  palabras del lenguaje del alumno y los conceptos de la cátedra que se muestran tal cual
  (`Cola`, `ColaOrdenada`, `signal_all`, nombres de eventos visibles).
- Comentarios, Javadoc/TSDoc, mensajes al usuario, documentación, commits y CHANGELOG:
  **español**, con tildes correctas.
- El núcleo (`nucleo/`, código y tests) ya está todo en inglés, incluidas las funciones que
  exporta al navegador (`create`, `step`, `state`...). Lo que quede mezclado en la interfaz
  se corrige al tocar cada archivo por otro motivo, en un commit `refactor` aparte.

**Diseño**
- Una responsabilidad por clase/módulo. Si un archivo supera ~400 líneas o un método ~40,
  es señal de que hay que partir, en un commit `refactor` aparte antes de hacerlo crecer.
- Datos inmutables por defecto (records en Java, `readonly` y objetos nuevos en TS).
- Sin estado global mutable, salvo el puente `SimulatorJs` (una simulación por pestaña).
- El núcleo es **determinista**: todo azar sale del `SeededRandom` de la VM. Nunca
  `Math.random`, `System.currentTimeMillis` ni `Date.now` dentro de `lang/` o `vm/`.

**Errores**
- Compilación: `CompilationException(mensaje, línea)`. Ejecución: `RuntimeError(mensaje, línea)`.
  Cualquier otra excepción se convierte en una de esas dos antes de salir del núcleo.
- Mensajes al alumno: español, qué pasó y, si se puede, qué hacer. Sin nombres de clases
  Java, sin inglés, sin stack traces.

**Comentarios**
- Explican el *porqué* y las decisiones, no repiten el código.
- Todo tipo o función pública tiene doc de una o dos líneas.
- Sin código comentado; sin `TODO` sin contexto (`TODO(B6): ...` o issue).

**Tests**
- Todo comportamiento nuevo o bug arreglado lleva test que falla sin el cambio.
- Nombre del test: el comportamiento, en inglés y `camelCase`
  (`errorInsideMonitorReleasesLock`). El Javadoc y los mensajes del test, en español.
- Con azar: varias semillas. Programas de ejemplo preferentemente desde `ejemplos/`.

**Dependencias**
- No agregar dependencias sin preguntar. En el núcleo, ninguna (TeaVM). En la interfaz,
  solo si ahorra mucho código y está mantenida.

**Formato**
- `.editorconfig` manda: UTF-8, LF, 4 espacios Java / 2 TS, 100 columnas Java.
- Formateo masivo, en su propio commit `style`.
