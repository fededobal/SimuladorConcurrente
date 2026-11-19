# Variables condición

La exclusión mutua impide que dos procesos modifiquen el estado del monitor a la vez, pero
no alcanza cuando un proceso tiene que esperar a que el estado cambie: un consumidor ante un
buffer vacío, por ejemplo. Para esperar dentro de un monitor se usan las variables
condición, declaradas con `cond`.

Cada variable condición es una cola de procesos demorados. No tiene valor propio: lo que el
proceso espera se guarda en variables permanentes, y la variable condición solo sirve para
dormir y despertar procesos.

## El dibujo del monitor

El [panel de monitores](/interfaz/monitores) dibuja cada monitor con las tres zonas que usa
la cátedra:

| Zona | Quiénes están | Cómo se llega |
|---|---|---|
| 1 · Compitiendo | La cola de entrada | Llamar con el monitor ocupado, o ser despertado |
| 2 · Bloqueado | Las colas de las variables condición | Ejecutar `wait` |
| 3 · Ejecutando | El proceso con acceso exclusivo | Entrar con el monitor libre, o ser elegido de la cola de entrada |

Las flechas del dibujo (call, entra, wait, signal, return) se resaltan cuando algún proceso
las recorre en el último instante.

## Signal and continue

La cátedra usa la disciplina *signal and continue*, y el simulador la implementa:

1. Un proceso dentro del monitor ejecuta `wait(cv)`: pasa al final de la cola de `cv` (zona
   2) y libera el monitor.
2. Otro proceso entra, cambia el estado y ejecuta `signal(cv)`: el primero de la cola de
   `cv` pasa a la cola de entrada (zona 1). El que hizo el `signal` sigue dentro (zona 3).
3. Cuando el monitor se libera, el despertado compite con los demás procesos de la cola de
   entrada. Si gana, continúa en la sentencia siguiente al `wait`.

`signal_all(cv)` despierta a todos los procesos de `cv`, que pasan a competir por el monitor.
Un `signal` sobre una variable sin procesos no tiene efecto posterior.

## Espera con `while` o con `if`

Entre los pasos 2 y 3 otro proceso puede entrar antes que el despertado y volver a cambiar
el estado. La espera se puede escribir de las dos formas, y se comportan distinto en ese
caso:

```monitores
while (cantidad == 0) wait(noVacio);   // al reingresar, vuelve a chequear la condición
if (cantidad == 0) wait(noVacio);      // al reingresar, sigue sin chequearla
```

| Forma | Al ser despertado | Es correcta cuando |
|---|---|---|
| `while` | Vuelve a evaluar la condición y, si no se cumple, se duerme otra vez | Siempre |
| `if` | Continúa en la sentencia siguiente al `wait` | Nadie puede adelantarse al despertado, o quien despierta le deja la condición asegurada (*passing the condition*) |

La teoría usa `if` a propósito en varias soluciones: en el buffer de un dato con un solo
proceso de cada lado, y en *passing the condition*, donde la decisión de cuándo puede
continuar un proceso la toma el que libera el recurso. En cambio, en el buffer limitado y en
la simulación de semáforos con varios procesos, un `if` falla en algunas ejecuciones.

Para comprobarlo, el ejemplo **Espera con if: un semáforo que falla** tiene la espera con
`if`: al ejecutarlo varias veces con turnos **Al azar**, en algunas la variable `s` llega a
-1 y dos procesos quedan a la vez en la sección crítica. El ejemplo **Simulación de
semáforos** es el mismo programa con `while`, y no falla
([Comparación de ejecuciones](/operacion/comparar-ejecuciones)).

## Técnicas habituales

| Técnica | Idea | Cuándo |
|---|---|---|
| Condición con `while` | Cada proceso vuelve a comprobar su condición al despertar | Caso general |
| *Passing the condition* | Quien despierta deja el estado resuelto para el despertado (por ejemplo, no marca el recurso como libre), y el despertado no vuelve a comprobar | Cuando nadie debe adelantarse al despertado |
| Contador de dormidos | Una variable entera cuenta los procesos en `wait`, porque no se puede preguntar si una variable condición está vacía | Para decidir si hay a quién despertar |
| Variables condición privadas | Un arreglo `cond espera[N]`, una por proceso, junto con una cola de identificadores | Para despertar a un proceso determinado o respetar un orden |
| `signal_all` | Despertar a todos y que cada uno compruebe | Barreras, o cuando no se sabe a quién le sirve el cambio |

Los programas de [ejemplo](/referencia/ejemplos) muestran varias de estas técnicas.
