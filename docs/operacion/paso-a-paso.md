# Ejecución paso a paso

## Objetivo

Seguir un programa instante por instante y relacionar cada sentencia con el efecto que
produce en los procesos y en los monitores.

## Procedimiento

1. Cargar el programa en el editor. Para practicar, abrir el menú del programa y elegir
   **Variables condición: wait y signal** en **Ejemplos**.
2. Elegir **En ronda** en **Turnos**. Con esta política avanzan todos los procesos que
   pueden hacerlo, en un orden previsible.
3. Presionar **Paso** (o la tecla F10). El programa se compila y avanza un instante.
4. En el editor, ubicar la etiqueta de cada proceso. Está en la línea que el proceso acaba
   de ejecutar o en la que está detenido, y dice su [estado](/ejecucion/estados). Si la línea
   quedó fuera de la vista, un aviso en el borde del editor lleva hasta ella.
5. En la [línea de tiempo](/interfaz/linea-de-tiempo), hacer clic en la última columna.
   Un cartel describe lo que hizo cada proceso en ese instante y acompaña al puntero; otro
   clic en la misma columna lo cierra.
6. En la pestaña [Monitores](/interfaz/monitores), observar qué flecha del dibujo se
   resaltó, en qué zona quedó cada proceso y qué dice el relato del instante.
7. Repetir desde el paso 3. Para avanzar varios instantes seguidos, presionar
   **Ejecutar** y luego **Pausar** (F5 en los dos casos).

## Avanzar un proceso elegido

Para armar a mano un entrelazado, se puede decidir qué proceso avanza en cada instante:

1. Abrir la flecha que está junto a **Paso**, o la pestaña **Procesos** del inspector.
2. Elegir un proceso (botón **Avanzar** en la pestaña). En ese instante avanza solo ese; los
   demás no se mueven.
3. Repetir con el proceso que corresponda. Solo se pueden elegir los procesos que están
   listos: de los demás se indica el estado.

Para volver a ver una ejecución completa tal como fue, **Repetir** la reinicia con la misma
semilla.

## Resultado esperado

En cada instante, el cartel de la línea de tiempo, la etiqueta del editor y el dibujo del
monitor coinciden. Por ejemplo, cuando el proceso `B` ejecuta `wait(C)`, el cartel lo
indica, la etiqueta de `B` pasa a violeta con el texto «dormido en wait(C)» y su nombre
aparece en la zona **2 · Bloqueado** del monitor `Buffer`.

## Observaciones

- La evaluación de la condición de un `while` o un `if` no ocupa un instante propio: la
  marca del proceso salta directamente a la sentencia siguiente
  ([Instantes y turnos](/ejecucion/instantes-y-turnos)).
- Con velocidad **Lento**, cada instante dura 1,2 s cuando se usa **Ejecutar**.
