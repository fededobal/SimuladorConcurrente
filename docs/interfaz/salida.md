# Salida

El panel de salida se abre con el botón **Salida** de la barra y muestra lo que escriben los
procesos con [`write`](/lenguaje/instrucciones/write).

<figure>

![Panel de salida con diez líneas: a la izquierda el instante, luego el nombre del proceso en su color (Productor o Consumidor) y el texto, de "deposite 1" a "retire 5"](/capturas/salida.png)

<figcaption>Salida del ejemplo Productor/Consumidor al terminar.</figcaption>
</figure>

| Qué | Cómo |
|---|---|
| Cada `write` | Una línea, con el instante y el nombre del proceso en su color |
| Capacidad | Las últimas 500 líneas; si hay más, un aviso dice cuántas se descartaron |
| Cerrar | El botón Salida, el de la esquina del panel o Escape |

::: tip
Con turnos al azar, el orden de la salida cambia entre ejecuciones: es la forma más directa
de observar el entrelazado ([Comparación de ejecuciones](/operacion/comparar-ejecuciones)).
:::
