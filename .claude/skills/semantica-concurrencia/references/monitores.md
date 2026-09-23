# Monitores: modelo, invariantes y casos canónicos

Fuente de verdad: `docs/monitores.md` (notación y teoría de la cátedra). Si este archivo y
ese documento difieren, gana el documento y hay que actualizar este archivo.

## Modelo

- **Monitor**: variables permanentes + `cond` + lock + cola de entrada. Un solo proceso
  adentro a la vez (`lockOwner`).
- **Proceso**: pila de `Activation` (cuerpo del proceso y procedures anidados). Estados
  `READY`, `RUNNING`, `BLOCKED(MONITOR_ENTRY | COND_WAIT)`, `TERMINATED`.
- **Instante**: el scheduler arma un turno (varios procesos listos, orden según política,
  cada uno con `PROB_AVANCE`% de chance, al menos uno). Cada proceso del turno ejecuta hasta
  una sentencia *observable* (las estructurales — bloques, evaluar guardas de `if/while/for` —
  no consumen instante). Con proceso elegido, avanza solo ese.
- **wait(c)**: suelta el lock, despierta a toda la cola de entrada (compiten), se encola en
  `c`, queda `COND_WAIT` y marca `needsLock` para reingresar.
- **signal(c)**: si `c` no está vacía, el primero pasa a la cola de entrada
  (`MONITOR_ENTRY`); el que señaliza **sigue** (*signal and continue*). Vacía ⇒ no hace nada.
- **signal_all(c)**: todos los de `c` a la cola de entrada.
- **Retorno de procedure**: copia parámetros `out`, suelta el lock, despierta a la cola de
  entrada.
- **Llamada de un procedure de A a B** (llamada abierta, ADR 0004): evalúa los argumentos
  con A tomado, suelta A (evento `RELEASE`), entra a B o espera en su cola, y al retornar
  compite por A como después de un `wait`. Los `out` hacia variables de A se escriben al
  reingresar. Un proceso tiene a lo sumo un monitor tomado.
- **Deadlock**: no terminó y ningún proceso está `READY`.

## Invariantes (todo cambio a la VM tiene que conservarlas)

1. En cada snapshot, cada monitor tiene como mucho un `lockOwner`, y ese proceso no está
   `TERMINATED`. Un proceso que falla adentro suelta el lock (bug B1, corregido).
2. Un proceso está en a lo sumo una cola (una `cond` o una cola de entrada).
3. Todo camino que saca a un proceso de un monitor (return, wait, **error**) suelta el lock
   y despierta la cola de entrada.
4. Con la misma semilla y la misma política, la ejecución es idéntica, en la JVM y en el
   navegador (`AzarTest` y el smoke fijan una traza). La interfaz no expone la semilla: cada
   ejecución usa una nueva y la reproducción se hace desde el núcleo.
5. `DEADLOCK` significa interbloqueo del programa del alumno, nunca un error interno del
   simulador. Un error de ejecución se informa como `ERROR` con línea.
6. El log y la salida no crecen sin tope en ejecuciones largas (`TOPE_LOG`, `TOPE_SALIDA`);
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
3. Relacionalo con la teoría (`docs/monitores.md` §2.1 signal and continue: por qué la
   condición se re-evalúa con `while`).
4. Si el comportamiento contradice la teoría, es un bug del simulador: escribí el test que
   lo muestra antes de arreglarlo.
