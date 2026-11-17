# Inspección de un monitor

## Objetivo

Conocer el estado completo de un monitor en un instante: quién está dentro, quién espera y
dónde, y el valor de sus variables permanentes.

## Procedimiento

1. Pausar la simulación en el instante que se quiere examinar.
2. En la pestaña **Monitores** del inspector, ubicar la tarjeta del monitor. El encabezado
   indica si está libre o qué proceso lo ocupa.
3. Para examinarlo con más espacio, ensanchar el inspector con el botón de su esquina
   superior derecha o arrastrando su borde izquierdo.
4. Mirar el dibujo: la zona **1 · Compiten** tiene a los que esperan entrar, la
   **2 · En wait** una fila por variable condición y la **3 · Adentro** al proceso que tiene
   el monitor, con su línea.
5. Leer el relato del instante, debajo del dibujo: dice qué pasó en el monitor en el último
   paso.
6. Leer las colas en el orden en que aparecen: la de entrada y una fila por variable
   condición, cada una en su orden.
7. Leer la tabla de variables. La columna **Escribió** indica qué proceso escribió cada una
   por última vez y en qué instante.
8. Para saber cómo se llegó a ese estado, recorrer hacia atrás el carril del monitor en la
   línea de tiempo y abrir la tarjeta de los instantes que interesen.

## Resultado esperado

El estado observado se explica con el código: cada proceso en **2 · En wait** ejecutó un
`wait` sobre esa variable, cada proceso en **1 · Compiten** llamó con el monitor ocupado o fue
despertado, y los valores de las variables coinciden con las últimas asignaciones.

## Observaciones

- La cola de entrada se muestra en orden de llegada, pero al liberarse el monitor entra un
  proceso elegido al azar ([Acceso al monitor](/ejecucion/acceso-al-monitor)).
- El encabezado de la tarjeta aclara cuando el proceso que ocupa el monitor no está
  ejecutando: está en `delay` o esperando dentro de otro monitor.
- Las listas largas muestran seis elementos y un botón para ver el resto.
- La pestaña **Procesos** muestra, para cada proceso, sus variables locales.
