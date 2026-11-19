---
relacionadas:
  - /lenguaje/expresiones
  - /lenguaje/instrucciones/delay
  - /operacion/comparar-ejecuciones
---

# `random`

Da un número entero al azar entre dos límites.

<Chips :items="['Expresión int', 'Límites incluidos', 'Se repite con la misma semilla']" />

## Sintaxis

```monitores
random(inf, sup)
random(1, 6)
random(0, N - 1)    // los límites son expresiones int
```

## Funcionamiento

Es una expresión de tipo `int`, no una sentencia: se usa donde va un valor, por ejemplo en
una asignación, en un argumento o en el tiempo de un `delay`. Vale un entero entre `inf` y
`sup`, con los dos límites incluidos y todos los valores con la misma probabilidad:
`random(1, 6)` da 1, 2, 3, 4, 5 o 6. Si los dos límites son iguales, da ese valor.

No ocupa un instante propio: se calcula junto con la sentencia que lo contiene.

El azar sale de la semilla de la ejecución, la misma que decide los turnos. Con
**Repetir** la ejecución usa la misma semilla y `random` vuelve a dar los mismos valores,
siempre que los turnos sean los mismos; una ejecución nueva usa otra semilla y da otros
([Comparación de ejecuciones](/operacion/comparar-ejecuciones)).

No se puede usar en el rango de un arreglo de procesos o de monitores ni en el tamaño de un
arreglo: esas cantidades se fijan antes de ejecutar.

::: tip Nota
`random` no figura en el material de la cátedra. El simulador lo agrega para escribir
tiempos y datos que cambian de una ejecución a otra, como la duración de una atención.
:::

## Errores

| Situación | Mensaje |
|---|---|
| Falta un límite o un paréntesis | `Se esperaba ',' entre los dos límites: se escribe random(inf, sup)` |
| Un límite no es `int` | `El límite superior de random tiene que ser int y es double` |
| En un rango o en un tamaño | `random no se puede usar en el rango de un arreglo de procesos: se fija antes de ejecutar` |
| Al ejecutar, `inf` mayor que `sup` | `random(5, 2): el límite inferior es mayor que el superior` |

## Ejemplo

Cada persona usa el cajero una cantidad de instantes elegida al azar entre 1 y 5.

```monitores
#define N 4

monitor Cajero {
  int usos = 0;

  procedure PasarAlCajero(tiempo: in int) {
    delay(tiempo);              // UsarCajero(): cada persona tarda distinto
    usos = usos + 1;
  }
}

process Persona[id: 0..N-1] {
  int tiempo = random(1, 5);
  Cajero.PasarAlCajero(tiempo);
  write("Persona ", id, ": usé el cajero ", tiempo, " instante(s)");
}
```
