# `delay`

Demora al proceso una cantidad de segundos reales.

## Sintaxis

```c
delay(5);
delay(t * 2);    // cualquier expresión int, de 0 a 3600
```

## Funcionamiento

El proceso queda demorado los segundos indicados, contados desde el instante en que ejecuta
el `delay`; en el editor, un contador muestra los que faltan. Mientras tanto los demás
procesos siguen avanzando.

Dentro de un procedure, el proceso conserva el monitor durante la demora y los demás
esperan en la cola de entrada. Si ningún proceso puede avanzar pero alguno está en `delay`,
el simulador espera a que termine y no informa un interbloqueo.

Como depende del reloj, un programa con `delay` no se repite igual en dos ejecuciones.

## Errores

| Situación | Mensaje |
|---|---|
| Tiempo no entero | `El tiempo del delay tiene que ser int y es double` |
| En la inicialización del monitor | `El código de inicialización del monitor M no puede llamar a monitores ni usar wait, signal o delay` |
| Fuera de rango (ejecución) | `El delay tiene que ser de 0 a 3600 segundos y es de 4000` |

## Ejemplo

```c
process Partido {
  Cancha.Iniciar();
  delay(90);          // se juega el partido
  Cancha.Terminar();
}
```
