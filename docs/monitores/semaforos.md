# Diferencia con los semáforos

Las operaciones sobre variables condición se parecen en el nombre a las de los semáforos,
pero se comportan distinto.

| | `wait(cv)` | `P(s)` |
|---|---|---|
| | El proceso **siempre** se duerme | Solo se duerme si `s == 0` |

| | `signal(cv)` | `V(s)` |
|---|---|---|
| | Si hay procesos dormidos, despierta al **primero**. Si no hay, **no tiene efecto posterior**. | Incrementa `s`; un proceso dormido o que hará `P` podrá continuar. No sigue ningún orden al despertar. |

El simulador no tiene semáforos: `sem`, `P` y `V` no son palabras reservadas y pueden usarse
como nombres comunes.
