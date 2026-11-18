---
relacionadas:
  - /lenguaje/instrucciones/signal
  - /lenguaje/instrucciones/signal-all
  - /ejecucion/variables-condicion
  - /operacion/deadlock
---

# `wait`

Demora al proceso en una variable condición y libera el monitor.

<Chips :items="['Sincronización', 'Solo dentro de un procedure', 'Libera el monitor', 'Siempre se demora']" />

## Sintaxis

```monitores
wait(cv);
wait(turno[i]);   // con un arreglo de cond, el índice es obligatorio
```

## Funcionamiento

El proceso pasa al final de la cola de la variable condición y deja el monitor libre para
otro proceso. Siempre se demora, aunque la condición que espera ya se cumpla. Vuelve a
competir por el monitor cuando otro proceso hace [`signal`](./signal) o
[`signal_all`](./signal-all) sobre esa variable, y al reingresar continúa en la sentencia
siguiente al `wait`.

Solo se usa dentro de un procedure.

<FiguraMonitor flecha="wait" :espera="{ cv: 'P' }">
Al hacer <code>wait(cv)</code>, P sale de la zona Adentro, queda al final de la cola de <code>cv</code> y el monitor queda libre.
</FiguraMonitor>

::: tip En el simulador
El dibujo del monitor muestra al proceso en la zona **En wait**, en la fila de su variable
condición; en la línea de tiempo, su tramo pasa a «wait». Ver
[Variables condición](/ejecucion/variables-condicion).
:::

::: warning Atención
Cuando el proceso despierta, la condición que esperaba puede haber dejado de cumplirse: otro
proceso pudo entrar antes. Con `while` el proceso la vuelve a chequear; con `if` sigue sin
chequearla, y el programa falla en las ejecuciones en que otro se adelantó
([Variables condición](/ejecucion/variables-condicion#espera-con-while-o-con-if)).
:::

## Errores

| Situación | Mensaje |
|---|---|
| Fuera de un procedure | `wait/signal/signal_all solo pueden usarse dentro de un procedure de monitor` |
| En la inicialización del monitor | `El código de inicialización del monitor M no puede llamar a monitores ni usar wait, signal o delay` |
| Variable no declarada | `Variable condición no declarada: c` |
| Arreglo sin índice | `La cond 'c' es un arreglo: falta el índice` |
| Índice fuera de rango (ejecución) | `Índice 5 fuera de rango para la cond 'c' (tamaño 2)` |
| Con prioridad: `wait(cv, rank)` | `En la práctica no se permite el wait con prioridad (wait(cv, rank)): se escribe wait(turno)` |

## Ejemplo

```monitores ejemplo=06-buffer-limitado
procedure depositar(datos: in int) {
  while (cantidad == n) wait(not_lleno);
  buf[libre] = datos;
  libre = (libre + 1) mod n;
  cantidad++;
  signal(not_vacio);
}
```
