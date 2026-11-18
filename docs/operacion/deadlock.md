# Diagnóstico de un deadlock

## Objetivo

Encontrar por qué un programa terminó en deadlock: qué espera cada proceso y por qué
nadie puede dárselo.

## Procedimiento

1. Ejecutar el programa hasta que la barra indique **Deadlock**. Si indica
   **Deadlock tras un error**, resolver primero el error marcado en rojo en el editor
   ([Errores en tiempo de ejecución](/problemas/errores-en-tiempo-de-ejecucion)).
2. Leer el cartel que aparece sobre el editor. Indica el instante, dónde espera cada proceso
   y qué monitores retiene:

   <figure>

   ![Simulador en deadlock en el instante 3: el cartel dice que P está dormido en wait(c) del monitor B sin soltar A y que Q espera entrar a A; el inspector muestra los monitores A y B y la tabla Por qué nadie avanza; la línea de tiempo marca el instante con una raya roja](/capturas/deadlock.png)

   <figcaption>P llamó a <code>B.esperar()</code> desde <code>A.usar()</code>, de modo que espera en <code>B.c</code> sin soltar <code>A</code>. Q, que haría el <code>signal</code>, no puede entrar a <code>A</code>.</figcaption>
   </figure>

3. En la pestaña **Monitores**, leer la tabla **Por qué nadie avanza**: para cada proceso
   bloqueado dice dónde está y qué lo despertaría.
4. Con **Ver el instante en la línea de tiempo**, del cartel, ir al instante del
   deadlock y recorrer hacia atrás los tramos de cada proceso.
5. Para cada proceso dormido en un `wait`, identificar en el código qué `signal` o
   `signal_all` debería despertarlo y qué proceso lo ejecuta.
6. Determinar por qué ese proceso no lo ejecutó, con la tabla siguiente.

| Situación del proceso que debía despertar | Causa probable |
|---|---|
| Terminó | El `signal` se ejecutó antes que el `wait` y no tuvo efecto |
| Espera entrar a un monitor retenido por el que espera | Llamada a otro monitor que conserva el primero |
| Está dormido en otro `wait` | Los dos procesos esperan uno del otro |
| No existe o nunca llama a ese procedure | Falta un proceso o una llamada en el programa |

7. Corregir el programa según la causa
   ([El programa se detiene](/problemas/el-programa-se-detiene)) y volver a ejecutarlo
   varias veces con turnos **Al azar**: un deadlock puede depender del entrelazado y no
   aparecer en todas las ejecuciones. Para volver a ver el mismo deadlock antes de
   corregir, **Repetir con la misma semilla** reinicia esa ejecución.

## Resultado esperado

Para cada proceso bloqueado se conoce la sentencia que lo despertaría y el motivo por el que
no se ejecutó. El ejemplo **Deadlock** de la lista de ejemplos muestra el primer caso de la
tabla: el `signal` del cliente se ejecuta antes que el `wait` del empleado y no tiene efecto.
