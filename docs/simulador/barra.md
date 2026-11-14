# La barra de controles

De izquierda a derecha:

- **Ejecutar** y **Pausar**. La simulación avanza sola, un instante por vez, hasta que se
  la pausa, termina o se traba.
- **Paso** avanza un solo instante. Sirve para seguir el programa con calma.
- **Detener** vuelve al principio del programa y vacía la línea de tiempo y la salida.
- **Velocidad**: cuánto dura cada instante en pantalla. Lento, normal, rápido y muy rápido
  corresponden a 1,2 s, 0,6 s, 0,3 s y 0,12 s por instante.
- **Turnos**: la política de planificación, que se puede cambiar durante la ejecución.
  - *Al azar*: en cada instante, cada proceso listo entra al turno con una probabilidad del
    80 % y al menos uno avanza. Unos van más rápido que otros, como en la realidad, y dos
    corridas del mismo programa pueden dar resultados distintos.
  - *En ronda*: avanzan todos los procesos listos, por turno. Es más fácil de seguir.
- **Ejemplos**: carga uno de los [programas de ejemplo](/ejemplos). Si el editor tiene un
  programa propio, pide confirmación antes de reemplazarlo.
- **Salida**: abre la [pantalla de salida](./salida) con lo que escriben los procesos. El
  número al lado es la cantidad de líneas.
- **Documentación**: abre este sitio.
- A la derecha, el estado de la simulación (listo, ejecutando, en pausa, fin, deadlock o
  error) y el número del instante actual.

Mientras la simulación está detenida se puede editar el programa; al apretar Ejecutar o Paso
se compila de nuevo.
