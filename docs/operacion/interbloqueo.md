# Diagnóstico de un interbloqueo

## Objetivo

Encontrar por qué un programa terminó en interbloqueo: qué espera cada proceso y por qué
nadie puede dárselo.

## Procedimiento

1. Ejecutar el programa hasta que la barra indique **deadlock**. Si indica **deadlock tras
   un error**, resolver primero el error marcado en rojo en el editor
   ([Errores en tiempo de ejecución](/problemas/errores-en-tiempo-de-ejecucion)).
2. En la línea de tiempo, abrir la tarjeta de la última columna. El mensaje indica, para
   cada proceso, dónde espera y qué monitores retiene:

   ```
   Interbloqueo: ningún proceso puede avanzar. P espera en B.c y retiene A
   ```

3. En el panel de monitores, revisar cada monitor. Anotar qué procesos están en
   **Compitiendo** y cuáles en **En wait**, y en qué variable condición.
4. Para cada proceso en **En wait**, identificar en el código qué `signal` o `signal_all`
   debería despertarlo y qué proceso lo ejecuta.
5. Determinar por qué ese proceso no lo ejecutó, con la tabla siguiente.

| Situación del proceso que debía despertar | Causa probable |
|---|---|
| Terminó | El `signal` se ejecutó antes que el `wait` y no tuvo efecto |
| Está en **Compitiendo** de un monitor retenido por el que espera | Llamada a otro monitor que conserva el primero |
| Está en **En wait** | Los dos procesos esperan uno del otro |
| No existe o nunca llama a ese procedure | Falta un proceso o una llamada en el programa |

6. Corregir el programa según la causa
   ([El programa se detiene](/problemas/el-programa-se-detiene)) y volver a ejecutarlo
   varias veces con turnos **Al azar**: un interbloqueo puede depender del entrelazado y no
   aparecer en todas las ejecuciones.

## Resultado esperado

Para cada proceso bloqueado se conoce la sentencia que lo despertaría y el motivo por el que
no se ejecutó. El ejemplo **Deadlock** del menú muestra el caso más simple: un proceso hace
`wait` y ningún otro hace `signal`.
