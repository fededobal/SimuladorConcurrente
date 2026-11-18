# Variables condición

```monitores
cond cv;
```

El valor asociado a `cv` es una **cola de procesos demorados**, no visible directamente
para el programador. Operaciones:

- **`wait(cv)`**: el proceso se demora al final de la cola de `cv` y **libera el acceso
  exclusivo al monitor**. Siempre se duerme, a diferencia del `P` de un semáforo.
- **`signal(cv)`**: despierta al proceso que está al frente de la cola de `cv`, si hay
  alguno, y lo saca de ella. Si la cola está vacía, `signal` **no tiene efecto**, a
  diferencia del `V` de un semáforo, que incrementa el contador.
- **`signal_all(cv)`** (*broadcast*): despierta a **todos** los procesos demorados en `cv`;
  la cola queda vacía.

## Disciplina de señalización: signal and continue

Es la única disciplina que usa la cátedra y la única que implementa el simulador.

- El proceso que hace `signal` **continúa** ejecutando dentro del monitor: conserva el
  acceso exclusivo.
- El proceso despertado **pasa a competir** por volver a entrar al monitor, para continuar
  en la instrucción que lógicamente sigue al `wait`.

Consecuencia práctica: entre el `signal` y el momento en que el proceso despertado
realmente reanuda, otros procesos pudieron entrar al monitor y cambiar el estado. Si eso
puede ocurrir, la condición se vuelve a chequear con un `while`; la teoría lo muestra con el
buffer limitado ("al continuar la ejecución después de ser despertados podría no darse la
condición"):

```monitores
procedure retirar(...) {
    while (cantidad == 0) wait(not_vacio);
    ...
}
```

Un `if` es correcto cuando nadie puede adelantarse al despertado (el buffer de un dato con
un proceso de cada lado) o cuando se hace *passing the condition*: "wait no se pone en un
loop pues la decisión de cuándo puede continuar un proceso la hace el proceso que libera el
recurso". El simulador acepta las dos formas, para que se pueda comprobar cuándo falla la
espera con `if`.

::: warning No implementado
*Signal and wait* (el que señaliza cede el monitor y el despertado entra de inmediato).
Tampoco `wait(cv, rank)` ni `minrank(cv)` (wait con prioridad), ni `empty(cv)` sobre una
variable condición.
:::

## Estados de un proceso respecto de un monitor

1. **Compitiendo por el monitor**: quiere entrar. Llamó a un procedure con el monitor
   ocupado, o fue despertado de una `cond` y todavía no reentró.
2. **En la cola de una variable condición** (en *wait*): hizo `wait(cv)` y espera un
   `signal`.
3. **Ejecutando dentro del monitor**: tiene el acceso exclusivo.

El panel Monitores del simulador dibuja cada monitor con estas tres zonas, rotuladas
Compiten, En wait y Adentro, como en la teoría (Teoría 4, diapositivas 12 a 19). Los
procesos son puntos de su color y se resalta la flecha que se recorrió en el último
instante (Call, entra, wait, signal o Return). Debajo del dibujo se listan los procesos de
cada zona; los que están en wait, agrupados por variable condición y en el orden de su
cola. Cómo leer ese panel y la línea de tiempo se explica en la sección
[Interfaz](/interfaz/).
