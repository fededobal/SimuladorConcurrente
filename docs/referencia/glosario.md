# Glosario

**Cola de entrada.** Cola de los procesos que esperan entrar a un monitor ocupado. En el
dibujo del monitor, la zona Compitiendo. Al liberarse el monitor, entra uno de sus procesos
elegido al azar.

**Condición privada.** Variable condición que usa un solo proceso, habitualmente como
elemento de un arreglo (`cond espera[N]`). Permite despertar a un proceso determinado.

**Entrelazado.** Orden en que se intercalan las sentencias de distintos procesos. Cambia
entre ejecuciones y puede cambiar el resultado de un programa mal sincronizado.

**Espera activa.** Ciclo que comprueba una condición sin dormir al proceso. En los
monitores se evita con variables condición.

**Exclusión mutua.** Propiedad por la que a lo sumo un proceso ejecuta dentro de un monitor
a la vez. En los monitores es implícita.

**Familia de procesos.** Conjunto de procesos con el mismo código, declarados con un rango
(`process Cliente[i: 1..5]`). Cada uno conoce su índice.

**Instante.** Paso de la simulación en el que cada proceso con turno ejecuta una sentencia.

**Interbloqueo** (*deadlock*). Situación en la que ningún proceso puede avanzar y no todos
terminaron.

**Llamada cerrada.** Llamada desde un procedure a otro monitor durante la cual el proceso
conserva el primer monitor.

**Monitor.** Módulo que agrupa el estado de un recurso compartido (variables permanentes) y
las operaciones sobre él (procedures), con exclusión mutua implícita.

**Pasaje de la condición.** Técnica en la que quien despierta a un proceso deja el estado
resuelto para él, de modo que el despertado no necesita volver a comprobarlo.

**Procedure.** Operación de un monitor. Es el único medio que tienen los procesos para leer
o modificar las variables permanentes.

**Proceso.** Código que se ejecuta concurrentemente con los demás. Los procesos son activos;
los monitores, pasivos.

**Signal and continue.** Disciplina de señalización de la cátedra: quien ejecuta `signal`
sigue dentro del monitor y el despertado compite por volver a entrar.

**Variable condición.** Cola de procesos demorados dentro de un monitor, declarada con
`cond`. Se opera con `wait`, `signal` y `signal_all`.

**Variable permanente.** Variable declarada en un monitor. Conserva su valor entre llamadas
y solo es accesible desde los procedures de ese monitor.
