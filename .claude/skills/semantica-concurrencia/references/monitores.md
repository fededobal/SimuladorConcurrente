# Monitores: modelo, invariantes y casos canónicos

Fuente de verdad: `docs/monitores/` (notación y teoría de la cátedra). Si este archivo y
ese documento difieren, gana el documento y hay que actualizar este archivo.

## Modelo

- **Monitor**: variables permanentes + `cond` + lock + cola de entrada. Un solo proceso
  adentro a la vez (`lockOwner`).
- **Proceso**: pila de `Activation` (cuerpo del proceso y procedures anidados). Estados
  `READY`, `RUNNING`, `BLOCKED(MONITOR_ENTRY | COND_WAIT)`, `TERMINATED`.
- **Instante**: el scheduler arma un turno (varios procesos listos, orden según política,
  cada uno con `ADVANCE_PROBABILITY`% de chance, al menos uno). Cada proceso del turno ejecuta hasta
  una sentencia *observable* (las estructurales — bloques, evaluar guardas de `if/while/for` —
  no consumen instante). Con proceso elegido, avanza solo ese.
- **Liberar el monitor** (ADR 0005 y 0006): se registra el evento de salida y el lock pasa
  a un proceso de la cola de entrada elegido al azar, que entra en ese momento
  (`ENTER`/`REENTER`); esa entrada es su acción del instante. El resto sigue compitiendo:
  la cátedra aclara que no se entra por orden de llegada.
- **wait(c)**: se encola en `c`, queda `COND_WAIT`, marca `needsLock` para reingresar y
  libera el monitor.
- **signal(c)**: si `c` no está vacía, el primero pasa a la cola de entrada
  (`MONITOR_ENTRY`); el que señaliza **sigue** (*signal and continue*). Vacía ⇒ no hace nada.
- **signal_all(c)**: todos los de `c` a la cola de entrada.
- **Retorno de procedure**: copia parámetros `out` y libera el monitor.
- **Llamada de un procedure de A a B** (llamada cerrada, ADR 0007): evalúa los argumentos,
  conserva A y entra a B o espera en su cola. Un `wait` en B libera solo B. Al retornar
  libera B, escribe los `out` y sigue en A. Un proceso puede tener varios monitores tomados
  (`holding` en el snapshot). Un ciclo A → B → A es error de ejecución.
- **delay(n)** (ADR 0008): el proceso queda `BLOCKED(DELAY)` durante los `n` instantes
  siguientes al del `delay`, sin soltar sus monitores y sin estar en ninguna cola. Al
  principio de cada paso se despiertan los que ya cumplieron. Si nadie está listo pero alguno
  está en delay, el instante pasa sin eventos (no hay deadlock).
- **Deadlock**: no terminó, ningún proceso está `READY` y ninguno está en delay.

## Invariantes (todo cambio a la VM tiene que conservarlas)

1. En cada snapshot, cada monitor tiene como mucho un `lockOwner`, y ese proceso no está
   `TERMINATED`. Un proceso que falla adentro suelta el lock (bug B1, corregido).
2. Un proceso está en a lo sumo una cola (una `cond` o una cola de entrada); uno en delay no
   está en ninguna.
3. Todo camino que saca a un proceso de un monitor (return, wait, **error**) libera el monitor: entra uno de la cola de entrada, al azar (ADR 0005 y 0006).
4. Con la misma semilla y la misma política, la ejecución es idéntica, en la JVM y en el
   navegador (`AzarTest` y el smoke fijan una traza). La interfaz no expone la semilla: cada
   ejecución usa una nueva y la reproducción se hace desde el núcleo.
5. `DEADLOCK` significa interbloqueo del programa del alumno, nunca un error interno del
   simulador. Un error de ejecución se informa como `ERROR` con línea.
6. El log y la salida no crecen sin tope en ejecuciones largas (`MAX_ENTRIES`, `MAX_LINES`);
   los eventos no guardan el estado completo.

## Programas canónicos (deben andar siempre)

Están en `VirtualMachineTest` y en `scripts/smoke-motor.mjs`:
exclusión mutua (`maxDentro == 1` con 4 procesos, 25 semillas), buffer de un dato con
`cond` (suma 15), `signal_all` (5 de 5 pasan), deadlock detectado, `out` devuelve valor,
`Cola` FIFO, `ColaOrdenada` por prioridad estable. Si un cambio rompe uno, el cambio está
mal salvo que la cátedra haya cambiado la semántica (y entonces se documenta en
`docs/decisiones/`).

Para cambios al scheduler, probá además con `RANDOM` en semillas 0..24 y con
`ROUND_ROBIN`, y verificá la invariante 1 en **cada** snapshot, no solo al final.

## Explicarle un resultado a un alumno

1. Reproducí con la misma semilla.
2. Recorré el log por instantes y señalá el evento clave (`SIGNAL` a cola vacía,
   `WAIT` con `if` en lugar de `while`, dos procesos compitiendo en la cola de entrada).
3. Relacionalo con la teoría (`docs/monitores/variables-condicion.md`, signal and continue: por qué la
   condición se re-evalúa con `while`).
4. Si el comportamiento contradice la teoría, es un bug del simulador: escribí el test que
   lo muestra antes de arreglarlo.
