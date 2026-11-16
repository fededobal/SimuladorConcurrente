# Inspección de un monitor

## Objetivo

Conocer el estado completo de un monitor en un instante: quién está dentro, quién espera y
dónde, y el valor de sus variables permanentes.

## Procedimiento

1. Pausar la simulación en el instante que se quiere examinar.
2. En el panel de monitores, ubicar el bloque del monitor. El encabezado indica si está
   libre o qué proceso está dentro.
3. Para examinarlo con más espacio, presionar el botón de la esquina del panel o hacer clic
   en el fondo del dibujo. La tecla Escape lo vuelve a su tamaño.
4. Hacer clic en una zona del dibujo (**Compitiendo**, **En wait** o **En monitor**). La
   lista de debajo muestra solo esa zona, completa y con la cantidad de procesos. El botón
   «ver todo» quita el filtro.
5. Leer las colas en el orden en que aparecen: la de entrada, el dueño y una fila por
   variable condición con procesos, cada una en su orden.
6. Leer las variables del monitor. El punto de color junto a cada valor indica qué proceso
   la escribió por última vez.
7. Para saber cómo se llegó a ese estado, recorrer hacia atrás el carril del monitor en la
   línea de tiempo.

## Resultado esperado

El estado observado se explica con el código: cada proceso en **En wait** ejecutó un `wait`
sobre esa variable, cada proceso en **Compitiendo** llamó con el monitor ocupado o fue
despertado, y los valores de las variables coinciden con las últimas asignaciones.

## Observaciones

- La cola de entrada se muestra en orden de llegada, pero al liberarse el monitor entra un
  proceso elegido al azar ([Acceso al monitor](/ejecucion/acceso-al-monitor)).
- Un punto con anillo en **En monitor** indica que el dueño no está ejecutando: está en
  `delay` o esperando dentro de otro monitor.
- Las listas largas muestran cinco elementos y un botón para ver el resto.
