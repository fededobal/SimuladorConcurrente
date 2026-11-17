# Técnicas de la cátedra e interbloqueo

## Estado de cada técnica en el simulador

| Técnica | ¿En el simulador? |
|---|---|
| Sincronización por condición básica (`while` + `wait`/`signal`) | Sí |
| *Broadcast signal* (`signal_all`) | Sí |
| *Passing the condition* (manejar el orden con variables o colas explícitas) | Se puede programar con `Cola` y varias `cond`; el simulador no lo asiste |
| Variables condición privadas (`cond turno[N]`) | Sí (arreglos de `cond`) |
| *Covering conditions* | Se puede programar (es `signal_all` + `while`) |
| Wait con prioridad (`wait(cv, rank)`, `minrank`) | No |
| *Rendezvous*, peluquero dormilón | Se puede programar con varias `cond` |
| Planificación de disco, monitor intermedio | Fuera del alcance de esta versión |

## Interbloqueo

El simulador no verifica propiedades de la sección crítica, pero **detecta el interbloqueo
(*deadlock*) de ejecución**: si en algún instante no hay ningún proceso listo para ejecutar
y no todos terminaron, porque todos están demorados en colas de entrada o de variables
condición, se informa el interbloqueo junto con los monitores que retiene cada proceso
bloqueado.

Un proceso demorado por `delay` no cuenta como bloqueado: mientras haya alguno, los
instantes siguen pasando hasta que termina su demora. Si el interbloqueo aparece después de que un proceso terminó
con un error de ejecución, el estado dice "deadlock tras un error": la causa es el error, no
la sincronización.
