# Acceso al monitor

Un monitor admite un solo proceso a la vez. Esa exclusión mutua es implícita: el programa
no escribe ningún protocolo de entrada ni de salida. Este capítulo describe cómo la aplica
el simulador.

## Entrada

Cuando un proceso llama a un procedure:

1. Si el monitor está libre, entra en ese mismo paso y empieza a ejecutar el procedure.
2. Si está ocupado, queda en la cola de entrada del monitor. En el dibujo aparece en la zona
   **1 · Compiten** y en el editor con una etiqueta ámbar que dice por qué monitor compite.

Si varios procesos llaman al mismo monitor libre en el mismo instante, entra el primero
según el orden del instante y los demás pasan a la cola de entrada.

## Salida

El proceso que está dentro libera el monitor al terminar el procedure o al ejecutar `wait`.
Si la cola de entrada tiene procesos, uno de ellos entra en ese mismo instante. Se elige al
azar: la cola de entrada no respeta el orden de llegada, como indica la explicación práctica
de la cátedra. Un proceso que espera desde hace más tiempo no tiene prioridad sobre uno que
acaba de llegar.

Para que los procesos pasen en orden de llegada, el orden tiene que programarse: una cola
con los identificadores y una variable condición por proceso, por ejemplo.

## Llamadas a otro monitor

Un procedure puede llamar a un procedure de otro monitor. Mientras esa llamada dura, el
proceso conserva el primer monitor, aunque haga `wait` en el segundo: nadie más puede entrar
al primero. En la tarjeta del primer monitor, el encabezado aclara que el proceso que lo
ocupa está esperando en el otro.

Esta regla puede producir un interbloqueo: si el proceso espera en el segundo monitor algo
que solo puede hacer otro proceso que necesita entrar al primero, ninguno avanza. El
simulador lo informa con los monitores que retiene cada proceso
([El programa se detiene](/problemas/el-programa-se-detiene)).

Un procedure no puede llamar a otro procedure de su propio monitor, y un proceso no puede
volver a entrar a un monitor que ya retiene.

## Errores dentro del monitor

Si un proceso provoca un error de ejecución dentro de un procedure, termina y libera los
monitores que tenía tomados. Los demás procesos siguen.
