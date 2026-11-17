# El programa se detiene

Un programa se detiene antes de terminar cuando ningún proceso puede avanzar. La barra
indica **deadlock** y la tarjeta del último instante de la línea de tiempo dice dónde
espera cada proceso. Esta página reúne las causas habituales; el procedimiento para
identificarlas está en [Diagnóstico de un interbloqueo](/operacion/interbloqueo).

## El aviso llegó antes que la espera

Un `signal` sobre una variable condición sin procesos no tiene efecto ni deja registro. Si
un proceso avisa antes de que el otro llegue al `wait`, el segundo se duerme y nadie lo
despierta. Es el caso del escritorio en el ejercicio 4 de la Explicación 3: el cliente llega
antes que el empleado.

Corrección: guardar el aviso en una variable permanente y dormir solo si todavía no llegó.

```monitores
procedure Atencion(D: in text; R: out text) {
  datos = D;
  listo = true;              // queda registrado aunque el empleado no haya llegado
  signal(vcEmpleado);
  wait(vcCliente);
  R = resultados;
  signal(vcEmpleado);
}

procedure EsperarDatos(D: out text) {
  if (not listo) wait(vcEmpleado);
  D = datos;
}
```

## Nadie ejecuta el signal

El proceso que debía despertar a los demás terminó, nunca llama a ese procedure, o hace
`signal` sobre otra variable condición. Corrección: revisar que cada `wait` tenga un
`signal` o un `signal_all` alcanzable sobre la misma variable. El ejemplo **Deadlock** del
menú muestra este caso.

## Llamada a otro monitor

Un procedure de A llama a B y espera en B. El proceso conserva A, y el que debía
despertarlo necesita entrar a A primero. El mensaje lo indica con `retiene`:

```
Interbloqueo: ningún proceso puede avanzar. P espera en B.c y retiene A
```

Corrección: hacer la llamada a B desde el proceso, después de salir de A, o reorganizar
los monitores para que la espera no ocurra con otro monitor tomado
([Acceso al monitor](/ejecucion/acceso-al-monitor)).

## Espera circular

Dos o más procesos esperan cada uno algo que solo puede hacer otro de ellos. Corrección:
revisar el orden de los `wait` y los `signal` de cada procedure, y que al menos uno de los
procesos pueda avanzar sin esperar.

## Casos que no son interbloqueo

| Situación | Qué indica la barra | Qué ocurre |
|---|---|---|
| Algún proceso está en `delay` | esperando que termine un delay | Los instantes pasan sin que avance nadie hasta que termina la demora |
| Un proceso terminó por un error | deadlock tras un error | La causa es el error ([Errores en tiempo de ejecución](./errores-en-tiempo-de-ejecucion)) |
| Un proceso ejecuta un ciclo infinito (`while (true)`) | ejecutando | El programa no termina, pero los procesos avanzan |
