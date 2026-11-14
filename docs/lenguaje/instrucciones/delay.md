# `delay`

```c
delay(5);          // el proceso se demora 5 segundos
delay(t * 2);      // cualquier expresión int, de 0 a 3600
```

| Regla | Detalle |
|---|---|
| Segundos reales | Contados desde el instante en que se ejecuta; en el editor, un contador muestra los que faltan |
| Dentro de un procedure | El proceso **sigue teniendo tomado el monitor**; los demás esperan en la cola de entrada |
| No es interbloqueo | Si nadie puede avanzar pero alguien está en `delay`, el simulador espera |
| Rango | De 0 a 3600; otro valor es error de ejecución |
| Dónde no | En el código de inicialización de un monitor (error de compilación) |

::: tip
Como depende del reloj, un programa con `delay` no se repite igual aunque se use la misma
semilla.
:::
