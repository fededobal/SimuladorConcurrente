# Presentación

El Simulador de Monitores es una herramienta para la enseñanza de la sincronización con
monitores en Programación Concurrente. Reúne un editor, en el que se escriben programas con
la notación de la cátedra, y un simulador que los ejecuta instante a instante y muestra qué
hace cada proceso y en qué estado queda cada monitor.

Los monitores siguen la disciplina *signal and continue*, la que se usa en la materia. El
simulador cuenta con:

- monitores con variables permanentes, variables condición, código de inicialización y
  procedures con parámetros `in` y `out`, además de arreglos de monitores
  ([Monitores](/lenguaje/monitores));
- procesos sueltos y familias de procesos ([Procesos](/lenguaje/procesos));
- los tipos `int`, `double`, `bool` y `text`, arreglos y las colas `Cola` y `ColaOrdenada`
  ([Tipos y arreglos](/lenguaje/tipos), [Colas](/lenguaje/colas));
- las instrucciones `wait`, `signal`, `signal_all`, `push`, `pop`, `write` y `delay`, el
  intercambio `:=:` y las estructuras `if`, `while` y `for`
  ([Instrucciones](/lenguaje/instrucciones/));
- un dibujo por monitor con las tres zonas que usa la cátedra: los procesos que compiten
  por entrar, los que esperan en cada variable condición y el que está adentro
  ([Panel de monitores](/interfaz/monitores));
- una línea de tiempo con una fila por proceso y un carril por monitor
  ([Línea de tiempo](/interfaz/linea-de-tiempo));
- dos políticas de turnos, al azar y en ronda, y la detección del interbloqueo
  ([Ejecución](/ejecucion/instantes-y-turnos));
- programas de ejemplo con los casos que se ven en clase
  ([Programas de ejemplo](/referencia/ejemplos)).

Todo se ejecuta en el navegador, sin instalación: el programa no sale de la computadora de
quien lo escribe.

## Organización de esta guía

| Sección | Contenido |
|---|---|
| Introducción | Qué es el simulador, un primer recorrido y cómo se escribe la notación de las clases |
| Lenguaje | Qué se puede escribir: estructura, tipos, monitores, procesos y una página por instrucción |
| Ejecución | Cómo avanza un programa: instantes, estados, acceso al monitor, variables condición |
| Interfaz | Qué muestra cada zona de la pantalla y cómo se usa |
| Operación | Procedimientos paso a paso para seguir, comparar y diagnosticar una ejecución |
| Solución de problemas | Qué significa cada error y qué hacer cuando el programa se detiene |
| Referencia | Límites, atajos de teclado, glosario y programas de ejemplo |

::: tip Simplificaciones
El simulador no reproduce un sistema operativo ni un lenguaje real: muestra cómo se
comportan los monitores. Un instante es un paso en el que cada proceso con turno ejecuta
una sentencia; no hay tiempo real salvo en `delay`. Cuando un monitor se libera, entra uno
de los procesos que esperaban, elegido al azar, sin respetar el orden de llegada. Un
procedure que llama a otro monitor conserva el suyo hasta que esa llamada termina. No hay
semáforos, pasaje de mensajes ni otras disciplinas de señalización.
:::

## Créditos

Este simulador fue desarrollado por Federico Dobal como Práctica Profesional Supervisada de
la carrera Analista en Tecnologías de la Información y la Comunicación, para la cátedra de
Programación Concurrente de la [Facultad de Informática](https://www.info.unlp.edu.ar/) de
la [Universidad Nacional de La Plata](https://unlp.edu.ar/).
