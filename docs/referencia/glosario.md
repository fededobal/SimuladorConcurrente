# Glosario

Términos que usan esta guía y las clases. Cada entrada indica dónde se observa el concepto
en el simulador y qué páginas lo amplían.

<div class="g-leyenda">
<span class="g-cat g-modelo">Modelo</span> qué se declara en un programa
<span class="g-cat g-sincronizacion">Sincronización</span> cómo se coordinan los procesos
<span class="g-cat g-ejecucion">Ejecución</span> cómo avanza la simulación
</div>

<nav class="g-letras" aria-label="Índice alfabético">
<span>A</span><a href="#b">B</a><a href="#c">C</a><a href="#d">D</a><a href="#e">E</a><a href="#f">F</a><span>G</span><span>H</span><a href="#i">I</a><span>J</span><span>K</span><a href="#l">L</a><a href="#m">M</a><span>N</span><span>O</span><a href="#p">P</a><span>Q</span><span>R</span><a href="#s">S</a><a href="#t">T</a><span>U</span><a href="#v">V</a><span>W</span><span>X</span><span>Y</span><span>Z</span>
</nav>

## B

<div class="g-termino g-ejecucion">

<span class="g-cat">Ejecución</span>

### *Busy waiting*

Espera en la que el proceso comprueba una condición una y otra vez en lugar de dormirse:
llama al monitor, no puede hacer la operación, sale y vuelve a llamar. Se evita con variables
condición, que duermen al proceso y liberan el monitor mientras espera.

**En el simulador.** El ejemplo Busy waiting muestra las entradas y salidas repetidas en la
línea de tiempo. Un ciclo sin sentencias que ocupen un paso registra el evento
`busy waiting (bucle sin avanzar)`. {.g-sim}

Véase [Instantes y turnos](/ejecucion/instantes-y-turnos) y
[Programas de ejemplo](/referencia/ejemplos#busy-waiting). {.g-vease}

</div>

## C

<div class="g-termino g-modelo">

<span class="g-cat">Modelo</span>

### Código de inicialización

Sentencias sueltas del cuerpo de un monitor, fuera de los procedures. Se ejecutan una vez,
antes de que cualquier proceso use el monitor, y no pueden llamar a otros monitores ni usar
`wait`, `signal` o `delay`.

**En el simulador.** No ocupa instantes: desde el primero, el panel de monitores muestra
las variables con los valores que dejó la inicialización. {.g-sim}

Véase [Monitores](/lenguaje/monitores). {.g-vease}

</div>

<div class="g-termino g-sincronizacion">

<span class="g-cat">Sincronización</span>

### Cola de entrada

Cola de los procesos que llamaron a un monitor ocupado, o que fueron despertados y todavía
no reingresaron. Cuando el monitor se libera entra uno de ellos, elegido al azar, sin
respetar el orden de llegada.

**En el simulador.** Zona «1 · Compiten» del dibujo del monitor y fila Entrada de sus colas;
etiqueta ámbar en el editor. {.g-sim}

Véase [Acceso al monitor](/ejecucion/acceso-al-monitor). {.g-vease}

</div>

<div class="g-termino g-modelo">

<span class="g-cat">Modelo</span>

### `ColaOrdenada`

Cola cuyo `push` inserta cada elemento ordenado por su primera componente: de menor a mayor
o, si se declara `desc`, de mayor a menor. A igual clave, sale primero el que se encoló antes.

**En el simulador.** Casilleros con el frente a la izquierda, entre las variables del
monitor. {.g-sim}

Véase [Colas](/lenguaje/colas). {.g-vease}

</div>

<div class="g-termino g-modelo">

<span class="g-cat">Modelo</span>

### Constante

Cantidad fija del programa, como la `N` de los enunciados, declarada con `#define N 5` al
principio. No es una variable: el compilador pone el número en cada lugar donde aparece el
nombre.

**En el simulador.** Menú Constantes del encabezado del editor; en el código, el nombre se
colorea como un número. {.g-sim}

Véase [Constantes](/lenguaje/constantes). {.g-vease}

</div>

## D

<div class="g-termino g-ejecucion">

<span class="g-cat">Ejecución</span>

### Deadlock

Situación en la que ningún proceso puede avanzar y no todos terminaron: cada uno espera en
una cola de entrada o en una variable condición.

**En el simulador.** La barra indica «Deadlock» y un cartel sobre el editor dice dónde
espera cada proceso, qué monitores retiene y por qué nadie puede despertarlo. {.g-sim}

Véase [Diagnóstico de un deadlock](/operacion/deadlock). {.g-vease}

</div>

## E

<div class="g-termino g-ejecucion">

<span class="g-cat">Ejecución</span>

### Entrelazado

Orden en que se intercalan las sentencias de distintos procesos. Cambia entre ejecuciones y
puede cambiar el resultado de un programa mal sincronizado.

**En el simulador.** El orden de las líneas de la salida y de los nombres en el carril de
cada monitor. {.g-sim}

Véase [Comparación de ejecuciones](/operacion/comparar-ejecuciones). {.g-vease}

</div>

<div class="g-termino g-ejecucion">

<span class="g-cat">Ejecución</span>

### Estado

Situación de un proceso en un instante: ejecutando en el proceso o en el monitor,
compitiendo, dormido en una variable condición, en `delay` o sin turno.

**En el simulador.** El color y el ícono de la etiqueta del editor y el aspecto de cada
tramo de la línea de tiempo. {.g-sim}

Véase [Estados de un proceso](/ejecucion/estados). {.g-vease}

</div>

<div class="g-termino g-sincronizacion">

<span class="g-cat">Sincronización</span>

### Exclusión mutua

Propiedad por la que a lo sumo un proceso ejecuta dentro de un monitor a la vez. En los
monitores es implícita: el programa no escribe ningún protocolo de entrada ni de salida.

**En el simulador.** El carril del monitor en la línea de tiempo nunca muestra dos nombres
en el mismo instante. {.g-sim}

Véase [Acceso al monitor](/ejecucion/acceso-al-monitor). {.g-vease}

</div>

## F

<div class="g-termino g-modelo">

<span class="g-cat">Modelo</span>

### Familia de procesos

Conjunto de procesos con el mismo código, declarados con un rango
(`process Cliente[i: 1..5]`). Cada uno conoce su índice, que es de solo lectura.

**En el simulador.** Una fila por proceso en la línea de tiempo, con una línea entre
familias; en el dibujo, la inicial y el índice (`Cliente[3]` es C3). {.g-sim}

Véase [Procesos](/lenguaje/procesos). {.g-vease}

</div>

## I

<div class="g-termino g-ejecucion">

<span class="g-cat">Ejecución</span>

### Instante

Paso de la simulación en el que cada proceso con turno ejecuta una sentencia. Las guardas
de `if`, `while` y `for` no ocupan un instante propio.

**En el simulador.** Cada columna de la línea de tiempo; el número actual se lee en la
barra. {.g-sim}

Véase [Instantes y turnos](/ejecucion/instantes-y-turnos). {.g-vease}

</div>

## L

<div class="g-termino g-sincronizacion">

<span class="g-cat">Sincronización</span>

### Llamada cerrada

Llamada desde un procedure a otro monitor durante la cual el proceso conserva el primer
monitor, aunque haga `wait` en el segundo.

**En el simulador.** La tarjeta del primer monitor indica que el proceso que lo ocupa está
demorado en el otro. {.g-sim}

Véase [Acceso al monitor](/ejecucion/acceso-al-monitor#llamadas-a-otro-monitor). {.g-vease}

</div>

## M

<div class="g-termino g-modelo">

<span class="g-cat">Modelo</span>

### Monitor

Módulo que agrupa el estado de un recurso compartido (variables permanentes) y las
operaciones sobre él (procedures), con exclusión mutua implícita. Los monitores son
pasivos: solo actúan cuando un proceso llama a uno de sus procedures.

**En el simulador.** Un bloque por monitor en el panel de monitores y un carril en la línea
de tiempo. {.g-sim}

Véase [Monitores](/lenguaje/monitores). {.g-vease}

</div>

## P

<div class="g-termino g-modelo">

<span class="g-cat">Modelo</span>

### Parámetros `in` y `out`

Modos de los parámetros de un procedure. Un parámetro `in` (el modo por omisión) se recibe
y no se modifica; uno `out` devuelve su valor al argumento del llamador al retornar.

**En el simulador.** El argumento de un `out` cambia de valor en el instante en que el
procedure retorna. {.g-sim}

Véase [Monitores](/lenguaje/monitores#procedures). {.g-vease}

</div>

<div class="g-termino g-sincronizacion">

<span class="g-cat">Sincronización</span>

### *Passing the condition*

Técnica en la que quien despierta a un proceso deja el estado resuelto para él (por
ejemplo, no marca el recurso como libre), de modo que el despertado no necesita volver a
comprobarlo y nadie puede adelantársele.

**En el simulador.** Aunque otro proceso entre antes que el despertado, la variable que
indica el estado no cambia. {.g-sim}

Véase [Variables condición](/ejecucion/variables-condicion#tecnicas-habituales). {.g-vease}

</div>

<div class="g-termino g-modelo">

<span class="g-cat">Modelo</span>

### Procedure

Operación de un monitor. Es el único medio que tienen los procesos para leer o modificar
las variables permanentes.

**En el simulador.** Mientras un proceso ejecuta un procedure, su etiqueta y su tramo de la
línea de tiempo se pintan en el tono pleno de su color. {.g-sim}

Véase [Llamada a monitor](/lenguaje/instrucciones/llamada). {.g-vease}

</div>

<div class="g-termino g-modelo">

<span class="g-cat">Modelo</span>

### Proceso

Código que se ejecuta concurrentemente con los demás. Los procesos son activos: son los
que avanzan, llaman a los monitores y esperan.

**En el simulador.** Una etiqueta con su nombre en el editor, una fila en la línea de tiempo
y otra en la pestaña Procesos, en un color propio. {.g-sim}

Véase [Procesos](/lenguaje/procesos). {.g-vease}

</div>

## S

<div class="g-termino g-sincronizacion">

<span class="g-cat">Sincronización</span>

### *Signal and continue*

Disciplina de señalización de la cátedra: quien ejecuta `signal` sigue dentro del monitor
y el despertado pasa a competir por volver a entrar. Cuando lo logra, la condición que
esperaba pudo haber cambiado: con `while` la vuelve a chequear; con `if` sigue sin
chequearla, lo que solo es correcto si nadie pudo adelantársele.

**En el simulador.** Tras un `signal`, el despertado pasa de la zona «2 · En wait» a la zona
«1 · Compiten», y el que señalizó sigue en «3 · Adentro». {.g-sim}

Véase [Variables condición](/ejecucion/variables-condicion#signal-and-continue). {.g-vease}

</div>

## T

<div class="g-termino g-ejecucion">

<span class="g-cat">Ejecución</span>

### Turno

Permiso para avanzar en un instante. Con turnos al azar, cada proceso que puede avanzar lo
recibe con una probabilidad del 80 %; en ronda, lo reciben todos.

**En el simulador.** Un proceso que podía avanzar y no recibió turno se muestra en gris. {.g-sim}

Véase [Instantes y turnos](/ejecucion/instantes-y-turnos#politicas-de-turnos). {.g-vease}

</div>

## V

<div class="g-termino g-sincronizacion">

<span class="g-cat">Sincronización</span>

### Variable condición

Cola de procesos demorados dentro de un monitor, declarada con `cond`. No tiene valor
propio; se opera con `wait`, `signal` y `signal_all`.

**En el simulador.** Zona «2 · En wait» del dibujo, con una fila por variable condición;
etiqueta violeta en el editor. {.g-sim}

Véase [Variables condición](/ejecucion/variables-condicion). {.g-vease}

</div>

<div class="g-termino g-modelo">

<span class="g-cat">Modelo</span>

### Variable permanente

Variable declarada en un monitor. Conserva su valor entre llamadas y solo es accesible
desde los procedures de ese monitor.

**En el simulador.** Sección Variables del monitor, con un punto del color del último
proceso que la escribió. {.g-sim}

Véase [Panel de monitores](/interfaz/monitores#variables-del-monitor). {.g-vease}

</div>

<div class="g-termino g-sincronizacion">

<span class="g-cat">Sincronización</span>

### Variables condición privadas

Variables condición que usa un solo proceso cada una, declaradas como un arreglo
(`cond espera[N];`). Permiten despertar a un proceso en particular y, junto con una cola de
identificadores, atender en un orden establecido.

**En el simulador.** Una fila `En wait(espera[i])` por cada elemento con un proceso
dormido. {.g-sim}

Véase [Variables condición](/ejecucion/variables-condicion). {.g-vease}

</div>
