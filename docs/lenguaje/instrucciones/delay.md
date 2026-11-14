# `delay`

```c
delay(5);          // el proceso se demora 5 segundos
delay(t * 2);      // cualquier expresión int, de 0 a 3600
```

Demora al proceso esa cantidad de segundos reales, contados desde el instante en que
ejecuta el `delay`. Mientras tanto el proceso figura "en delay" y, al lado de su nombre en
el editor, un contador muestra los segundos que faltan. Si el `delay` está dentro de un
procedure, el proceso **sigue teniendo tomado el monitor**: los demás esperan en la cola de
entrada, como en el ejercicio del partido de fútbol de la práctica.

Si ningún proceso puede avanzar pero alguno está en `delay`, no es un interbloqueo: el
simulador espera a que termine. No se puede usar en el código de inicialización de un
monitor. Como depende del reloj, un programa con `delay` no se repite igual aunque se use
la misma semilla.

Un valor fuera de 0 a 3600 es error de ejecución.
