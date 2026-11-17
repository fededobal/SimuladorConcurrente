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
| 1 · Compiten | La cola de entrada | Llamar con el monitor ocupado, o ser despertado |
| 2 · En wait | Las colas de las variables condición | Ejecutar `wait` |
| 3 · Adentro | El proceso con acceso exclusivo | Entrar con el monitor libre, o ser elegido de la cola de entrada |

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

Entre los pasos 2 y 3 otro proceso puede entrar antes y volver a cambiar el estado. Por eso
la espera se escribe con `while`: al reingresar, el proceso vuelve a evaluar la condición.

```monitores
while (cantidad == 0) wait(noVacio);   // correcto: se vuelve a comprobar
if (cantidad == 0) wait(noVacio);      // incorrecto si otro puede adelantarse
```

`signal_all(cv)` despierta a todos los procesos de `cv`; cada uno vuelve a evaluar su
condición cuando entra. Un `signal` sobre una variable sin procesos no tiene efecto.

## Técnicas habituales

| Técnica | Idea | Cuándo |
|---|---|---|
| Condición con `while` | Cada proceso vuelve a comprobar su condición al despertar | Caso general |
| Pasaje de la condición | Quien despierta deja el estado resuelto para el despertado (por ejemplo, no marca el recurso como libre), y el despertado no vuelve a comprobar | Cuando nadie debe adelantarse al despertado |
| Contador de dormidos | Una variable entera cuenta los procesos en `wait`, porque no se puede preguntar si una variable condición está vacía | Para decidir si hay a quién despertar |
| Variables condición privadas | Un arreglo `cond espera[N]`, una por proceso, junto con una cola de identificadores | Para despertar a un proceso determinado o respetar un orden |
| `signal_all` | Despertar a todos y que cada uno compruebe | Barreras, o cuando no se sabe a quién le sirve el cambio |

Los programas de [ejemplo](/referencia/ejemplos) muestran varias de estas técnicas.
