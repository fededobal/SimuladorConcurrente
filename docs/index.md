# ¿Qué es el simulador?

El Simulador de Monitores es una herramienta para la enseñanza y el aprendizaje de la
sincronización con monitores en la materia Programación Concurrente de la Facultad de
Informática de la Universidad Nacional de La Plata. El alumno escribe un programa en el
pseudocódigo de la cátedra, lo ejecuta instante a instante y observa qué hace cada proceso,
quién tiene cada monitor y quién espera en cada variable condición.

Todo funciona en el navegador. El núcleo que compila y ejecuta los programas está escrito en
Java 21 y se traduce a JavaScript con TeaVM; la interfaz está hecha con React. No hay
servidor: el programa del alumno no sale de su máquina.

## Qué ofrece

- Un editor con resaltado de sintaxis para el lenguaje de la cátedra, con los errores de
  compilación y de ejecución en español y con la línea donde ocurrieron.
- Ejecución de corrido o de a un instante, con cuatro velocidades y dos políticas de turnos:
  al azar, donde en cada instante avanza un subconjunto de los procesos listos, o en ronda.
- Una franja de color sobre la línea en la que está cada proceso, que cambia de aspecto
  según el proceso esté ejecutando, compitiendo por un monitor, esperando en una variable
  condición o demorado.
- Un panel por monitor, con el dibujo de las tres zonas que usa la cátedra (compitiendo, en
  wait y en monitor), las colas de procesos y las variables del monitor dibujadas según su
  estructura.
- Una línea de tiempo con una fila por proceso y un carril por monitor, que muestra la
  exclusión mutua y las esperas de un vistazo y narra en palabras lo que pasó en cada
  instante.
- La detección del interbloqueo (*deadlock*) cuando ningún proceso puede avanzar.
- Programas de ejemplo cargables desde el menú, que cubren los casos vistos en clase.

## Qué cubre y qué no

El alcance es, a propósito, solo monitores con la disciplina *signal and continue*. No se
incluyen semáforos, pasaje de mensajes ni otras disciplinas de señalización.

El lenguaje es un pseudocódigo tipado de estilo C: monitores con variables permanentes y
variables condición, procesos y familias de procesos, los tipos `int`, `double`, `bool` y
`text`, arreglos, colas comunes y ordenadas declaradas con los tipos de sus componentes, y
las instrucciones `if`, `while`, `for`, `wait`, `signal`, `signal_all`, `write` y `delay`.
Está descripto en la sección [Lenguaje](/lenguaje/) y, con la gramática formal, en la
[especificación](/lenguaje/especificacion).

::: tip Simplificaciones
El simulador no reproduce un sistema operativo ni un lenguaje real. Un instante es un paso
del planificador en el que cada proceso que tiene turno ejecuta una sentencia; no hay
tiempos reales salvo en `delay`. Cuando el monitor se libera, entra uno de los procesos que
esperaban, elegido al azar, sin respetar el orden de llegada. Un procedure que llama a otro
monitor conserva el suyo hasta que esa llamada termina.
:::

## Cómo se usa esta documentación

La sección [Simulador](/simulador/) explica cada panel de la pantalla y cómo leerlo. La
sección [Lenguaje](/lenguaje/) describe todo lo que se puede escribir, con una página por
instrucción y la lista de los errores que avisa el compilador. En
[Programas de ejemplo](/ejemplos) están los programas del menú Ejemplos, comentados.

## Créditos

El simulador fue desarrollado por Federico Dobal como Práctica Profesional Supervisada de la
carrera Analista en Tecnologías de la Información y la Comunicación, Facultad de
Informática, Universidad Nacional de La Plata.
