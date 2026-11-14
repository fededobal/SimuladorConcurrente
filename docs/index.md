# ¿Qué es el simulador?

El Simulador de Monitores es una herramienta para la enseñanza y el aprendizaje de la
sincronización con monitores en Programación Concurrente. Consta de un editor para escribir
programas en el pseudocódigo de la cátedra y de un simulador que los ejecuta instante a
instante y muestra qué hace cada proceso.

Trabaja con monitores bajo la disciplina *signal and continue*, y cuenta con:

- un [editor](/simulador/editor) con resaltado de sintaxis, que marca sobre el código en
  qué línea está cada proceso y en qué estado;
- [monitores](/lenguaje/monitores) con variables permanentes, variables condición y
  procedures con parámetros `in` y `out`, y arreglos de monitores;
- [procesos](/lenguaje/procesos) sueltos y familias de procesos;
- los tipos `int`, `double`, `bool` y `text`, [arreglos](/lenguaje/tipos) y
  [colas](/lenguaje/colas) comunes y ordenadas;
- las instrucciones `wait`, `signal`, `signal_all`, `write` y `delay`, además de `if`,
  `while` y `for` ([sentencias](/lenguaje/sentencias));
- un [panel por monitor](/simulador/monitores) con el dibujo de la cátedra: quién compite,
  quién espera en cada variable condición y quién está adentro, y las variables del monitor;
- una [línea de tiempo](/simulador/linea-de-tiempo) con una fila por proceso y un carril
  por monitor;
- dos políticas de turnos, al azar y en ronda, y la detección del interbloqueo
  ([ejecución](/simulador/ejecucion));
- [programas de ejemplo](/ejemplos) con los casos vistos en clase.

Todo funciona en el navegador, sin instalar nada: el programa no sale de la máquina del
alumno.

::: tip Simplificaciones
El simulador no reproduce un sistema operativo ni un lenguaje real: busca mostrar cómo se
comportan los monitores. Un instante es un paso en el que cada proceso que tiene turno
ejecuta una sentencia; no hay tiempo real salvo en `delay`. Cuando un monitor se libera,
entra uno de los procesos que esperaban, elegido al azar, sin respetar el orden de llegada.
Un procedure que llama a otro monitor conserva el suyo hasta que esa llamada termina. No
hay semáforos, pasaje de mensajes ni otras disciplinas de señalización; la lista completa
está en [Qué no existe](/lenguaje/no-existe).
:::

## Créditos

Este simulador fue hecho por Federico Dobal como Práctica Profesional Supervisada de la
carrera Analista en Tecnologías de la Información y la Comunicación, para la cátedra de
Programación Concurrente de la [Facultad de Informática](https://www.info.unlp.edu.ar/)
de la [Universidad Nacional de La Plata](https://unlp.edu.ar/).
