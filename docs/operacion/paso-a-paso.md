# Ejecución paso a paso

## Objetivo

Seguir un programa instante por instante y relacionar cada sentencia con el efecto que
produce en los procesos y en los monitores.

## Procedimiento

1. Cargar el programa en el editor. Para practicar, elegir **Productor/Consumidor** en
   **Ejemplos**.
2. Elegir **En ronda** en **Turnos**. Con esta política avanzan todos los procesos que
   pueden hacerlo, en un orden previsible.
3. Presionar **Paso**. El programa se compila y avanza un instante.
4. En el editor, ubicar la franja de cada proceso. Indica la línea que el proceso acaba de
   ejecutar o en la que está detenido, y su [estado](/ejecucion/estados).
5. En la [línea de tiempo](/interfaz/linea-de-tiempo), pasar el puntero por la última
   columna. La tarjeta describe lo que hizo cada proceso en ese instante; un clic la deja
   fija.
6. En el [panel de monitores](/interfaz/monitores), observar qué flecha del dibujo se
   resaltó y en qué zona quedó cada proceso.
7. Repetir desde el paso 3. Para avanzar varios instantes seguidos, presionar
   **Ejecutar** y luego **Pausar**.

## Resultado esperado

En cada instante, la tarjeta de la línea de tiempo, la franja del editor y el dibujo del
monitor coinciden. Por ejemplo, cuando el consumidor ejecuta `wait(ocupado)`, la tarjeta lo
indica, la franja del consumidor se pinta con rayado ladrillo y su punto pasa a la zona
**En wait** del monitor `Buffer`.

## Observaciones

- La evaluación de la condición de un `while` o un `if` no ocupa un instante propio: la
  franja salta directamente a la sentencia siguiente
  ([Instantes y turnos](/ejecucion/instantes-y-turnos)).
- Con velocidad **Lento**, cada instante dura 1,2 s cuando se usa **Ejecutar**.
