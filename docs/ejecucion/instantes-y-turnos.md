# Instantes y turnos

La simulación avanza por instantes. En cada instante, los procesos que tienen turno
ejecutan una sentencia cada uno, todos a la vez. Así se representa que los procesos corren
en paralelo y no de a uno.

## Qué ocupa un paso

| Ocupa un paso | No ocupa un paso propio |
|---|---|
| Asignación, `++`, `--`, `:=:` | La evaluación de la condición de `if`, `while` y `for` |
| Declaración de una variable local | La entrada a un bloque `{ ... }` |
| Llamada a un monitor (entrar o quedar esperando) | |
| `wait`, `signal`, `signal_all` | |
| `push`, `pop`, `write`, `delay`, `skip` | |

Lo que no ocupa un paso se resuelve junto con la sentencia siguiente. Un ciclo cuyo cuerpo
no tiene ninguna sentencia que ocupe un paso, como `while (true) { }`, no avanzaría nunca;
el simulador lo corta y registra el evento `espera activa (bucle sin avanzar)`.

## Políticas de turnos

La política se elige en la [barra de controles](/interfaz/barra) y puede cambiarse durante
la ejecución.

| Política | Quién avanza en cada instante | Uso |
|---|---|---|
| Al azar | Cada proceso que puede avanzar entra al turno con una probabilidad del 80 %, en orden aleatorio; al menos uno avanza | Observar que el resultado depende del entrelazado: dos ejecuciones pueden diferir |
| En ronda | Todos los procesos que pueden avanzar, en orden de declaración, empezando cada instante por el siguiente al que empezó el anterior | Seguir el programa con un orden de avance previsible |

El orden dentro del instante importa cuando varios procesos llaman a un monitor libre en el
mismo instante: entra el primero y los demás quedan en la cola de entrada.

## Azar y repetición

Cada ejecución toma una semilla distinta del reloj. Con turnos al azar, dos ejecuciones del
mismo programa casi nunca coinciden. Con turnos en ronda el orden de avance es fijo, pero
quién entra a un monitor que se libera con varios procesos esperando se sigue sorteando
([Acceso al monitor](./acceso-al-monitor)). `delay` no agrega otra fuente de variación: se
mide en instantes y no depende del tiempo real.
