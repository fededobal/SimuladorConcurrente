# Programas de ejemplo

Son los programas de la lista **Ejemplos** del menú del programa, en la barra. Cada uno
trata un tema de la programación concurrente con monitores y está tomado de la Teoría 4 o de
la Explicación 3 (explicación práctica de monitores) de la materia, con los cambios de
[notación](/introduccion/notacion-de-la-catedra) que el simulador requiere: los ciclos
infinitos se reemplazan por una cantidad fija de repeticiones para que el programa termine, y
las funciones sin definir, por `delay` o por una expresión.

Todos forman parte de las pruebas del simulador: se ejecutan con turnos al azar y 25 semillas
distintas, y una vez con turnos en ronda, y en todos los casos terminan con el resultado
indicado.

| N.º | Ejemplo | Tema | Origen |
|---|---|---|---|
| 1 | [Exclusión mutua implícita](#exclusion-mutua-implicita) | Exclusión mutua implícita | Explicación 3, ejercicio 1 |
| 2 | [Parámetros de salida (out)](#parametros-de-salida-out) | Parámetros `out` | Teoría 4, ejemplo de uso de monitores |
| 3 | [Busy waiting](#busy-waiting) | *Busy waiting* | Teoría 4, ejemplo de uso de monitores |
| 4 | [Variables condición: wait y signal](#variables-condicion-wait-y-signal) | `wait` y `signal` | Teoría 4, ejemplo de uso de monitores |
| 5 | [Monitor con código de inicialización](#monitor-con-codigo-de-inicializacion) | Código de inicialización | Teoría 4, notación; Explicación 3, sintaxis |
| 6 | [Arreglos: buffer limitado](#arreglos-buffer-limitado) | Arreglos y espera con `while` | Teoría 4, buffer limitado |
| 7 | [Espera con if: un semáforo que falla](#espera-con-if-un-semaforo-que-falla) | Espera con `if` | Teoría 4, simulación de semáforos (primera versión) |
| 8 | [Simulación de semáforos](#simulacion-de-semaforos) | Simulación de semáforos | Teoría 4, simulación de semáforos (condición básica) |
| 9 | [Passing the condition](#passing-the-condition) | *Passing the condition* | Explicación 3, ejercicio 2 |
| 10 | [Barrera con signal_all](#barrera-con-signal-all) | `signal_all` | Explicación 3, ejercicio 5 |
| 11 | [Lectores y escritores (broadcast signal)](#lectores-y-escritores-broadcast-signal) | *Broadcast signal* | Teoría 4, lectores y escritores |
| 12 | [Covering conditions: reloj lógico](#covering-conditions-reloj-logico) | *Covering conditions* | Teoría 4, reloj lógico |
| 13 | [Cola: pedidos en orden de llegada](#cola-pedidos-en-orden-de-llegada) | `Cola` | Explicación 3, ejercicio 6 |
| 14 | [ColaOrdenada: primero el más corto](#colaordenada-primero-el-mas-corto) | `ColaOrdenada` | Estructura usada en la Teoría 4 y la Explicación 3 |
| 15 | [Vector de cond: variables condición privadas](#vector-de-cond-variables-condicion-privadas) | Vector de `cond` | Teoría 4, alocación SJN con variables condición privadas |
| 16 | [Prioridad: ColaOrdenada de mayor a menor](#prioridad-colaordenada-de-mayor-a-menor) | `ColaOrdenada` con `desc` | Explicación 3, ejercicio 3 |
| 17 | [Rendezvous: peluquero dormilón](#rendezvous-peluquero-dormilon) | *Rendezvous* | Teoría 4, peluquero dormilón |
| 18 | [Vector de monitores](#vector-de-monitores) | Vector de monitores | Notación de la Explicación 3, ejercicio 4 |
| 19 | [Llamadas entre monitores](#llamadas-entre-monitores) | Llamadas entre monitores | Explicación 3, sintaxis |
| 20 | [Deadlock](#deadlock) | *Deadlock* | Explicación 3, ejercicio 4 |
| 21 | [Problema completo: banco y escritorios](#problema-completo-banco-y-escritorios) | Problema completo | Explicación 3, ejercicio 4 |

## Exclusión mutua implícita

Cinco personas (la constante `N`) usan un cajero automático sin respetar ningún orden. El monitor `Cajero` representa al recurso: el uso, simulado con `delay`, ocurre dentro del procedure. Mientras una persona está adentro, las demás compiten por entrar y, cuando el monitor queda libre, pasa cualquiera de ellas, no la que llegó primero.

Resultado esperado: al terminar, `Cajero.usos` vale 5.

```monitores
#define N 5

monitor Cajero {
  int usos = 0;

  procedure PasarAlCajero() {
    delay(2);              // UsarCajero()
    usos = usos + 1;
  }
}

process Persona[id: 0..N-1] {
  Cajero.PasarAlCajero();
  write("Persona ", id, ": usé el cajero");
}
```

## Parámetros de salida (out)

Tres empleados hacen productos y un coordinador consulta cada cierto tiempo cuántos hay. Los procesos no ven la variable permanente `cant`: el procedure `verificar` devuelve su valor por el parámetro `out` `R`, que al retornar queda en la variable `c` del coordinador. Los valores que lee el coordinador cambian según el entrelazado.

Resultado esperado: al terminar, `TOTAL.cant` vale 6.

```monitores
monitor TOTAL {
  int cant = 0;

  procedure incrementar() {
    cant = cant + 1;
  }

  procedure verificar(R: out int) {
    R = cant;
  }
}

process empleado[id: 0..2] {
  for (1..2) {
    delay(1);              // hace un producto
    TOTAL.incrementar();
  }
}

process coordinador {
  int c;
  for (1..3) {
    delay(2);              // cada cierto tiempo
    TOTAL.verificar(c);
    write("productos hechos hasta ahora: ", c);
  }
}
```

## Busy waiting

El proceso `A` le comunica tres valores al proceso `B` a través de un buffer de un dato, sin variables condición. Cada procedure devuelve en `Ok` si pudo hacer la operación; cuando no pudo, el proceso sale del monitor y vuelve a llamar. En la línea de tiempo se ven las entradas y salidas repetidas de un proceso que no logra avanzar.

Resultado esperado: al terminar, `Buffer.hayDato` vale `false` y `Buffer.dato` vale 3.

```monitores
monitor Buffer {
  int dato;
  bool hayDato = false;

  procedure Enviar(D: in int; Ok: out bool) {
    Ok = not hayDato;
    if (Ok) {
      dato = D;
      hayDato = true;
    }
  }

  procedure Recibir(R: out int; Ok: out bool) {
    Ok = hayDato;
    if (Ok) {
      R = dato;
      hayDato = false;
    }
  }
}

process A {
  bool ok;
  int aux;
  for (aux = 1..3) {       // genera el valor a enviar en aux
    ok = false;
    while (not ok) Buffer.Enviar(aux, ok);
  }
}

process B {
  bool ok;
  int aux;
  for (1..3) {
    ok = false;
    while (not ok) Buffer.Recibir(aux, ok);
    write("recibí ", aux);     // trabaja con el valor recibido
  }
}
```

## Variables condición: wait y signal

El mismo problema del ejemplo anterior, resuelto con sincronización por condición. El proceso que no puede seguir se duerme con `wait` en una variable condición y deja el acceso exclusivo al monitor; el otro lo despierta con `signal` y continúa adentro, porque la disciplina es *signal and continue*. Con un solo proceso de cada tipo, la condición se chequea con `if`, como en la teoría.

Resultado esperado: al terminar, `Buffer.hayDato` vale `false` y `Buffer.dato` vale 3.

```monitores
monitor Buffer {
  int dato;
  bool hayDato = false;
  cond P, C;

  procedure Enviar(D: in int) {
    if (hayDato) wait(P);
    dato = D;
    hayDato = true;
    signal(C);
  }

  procedure Recibir(R: out int) {
    if (not hayDato) wait(C);
    R = dato;
    hayDato = false;
    signal(P);
  }
}

process A {
  int aux;
  for (aux = 1..3) {       // genera el valor a enviar en aux
    Buffer.Enviar(aux);
  }
}

process B {
  int aux;
  for (1..3) {
    Buffer.Recibir(aux);
    write("recibí ", aux);     // trabaja con el valor recibido
  }
}
```

## Monitor con código de inicialización

El monitor `Deposito` carga el arreglo `stock` y calcula `total` en su código de inicialización: las sentencias que están fuera de los procedures. Ese código se ejecuta una sola vez y, hasta que no termina, el monitor no atiende llamados. En el instante 0 el panel de monitores ya muestra las variables con los valores cargados.

Resultado esperado: al terminar, `Deposito.total` vale 16.

```monitores
monitor Deposito {
  int stock[4];
  int total = 0;

  // código de inicialización
  for (int i = 0..3) {
    stock[i] = (i + 1) * 2;
    total = total + stock[i];
  }

  procedure retirar(producto: in int; quedan: out int) {
    stock[producto] = stock[producto] - 1;
    total = total - 1;
    quedan = stock[producto];
  }
}

process Cliente[id: 0..3] {
  int quedan;
  Deposito.retirar(id, quedan);
  write("Cliente ", id, ": retiré una unidad y quedan ", quedan);
}
```

## Arreglos: buffer limitado

Dos productores y dos consumidores comparten un buffer de `n` lugares, implementado con un arreglo circular. Con varios procesos de cada tipo, al continuar después de ser despertado podría no darse la condición, porque otro proceso entró antes al monitor; por eso acá la condición se vuelve a chequear con `while`. Si se reemplazan los `while` por `if`, en algunas ejecuciones `cantidad` llega a valer 4 o -1: un proceso depositó en el buffer lleno o retiró del buffer vacío.

Resultado esperado: al terminar, `Buffer_Limitado.cantidad` vale 0, y `libre` y `ocupado` valen 2.

```monitores
#define n 3

monitor Buffer_Limitado {
  int buf[n];
  int ocupado = 0, libre = 0, cantidad = 0;
  cond not_lleno, not_vacio;

  procedure depositar(datos: in int) {
    while (cantidad == n) wait(not_lleno);
    buf[libre] = datos;
    libre = (libre + 1) mod n;
    cantidad++;
    signal(not_vacio);
  }

  procedure retirar(resultado: out int) {
    while (cantidad == 0) wait(not_vacio);
    resultado = buf[ocupado];
    ocupado = (ocupado + 1) mod n;
    cantidad--;
    signal(not_lleno);
  }
}

process Productor[id: 0..1] {
  for (int i = 1..4) {
    Buffer_Limitado.depositar(id * 10 + i);
  }
}

process Consumidor[id: 0..1] {
  int dato;
  for (1..4) {
    Buffer_Limitado.retirar(dato);
    write("Consumidor ", id, ": retiré ", dato);
  }
}
```

## Espera con if: un semáforo que falla

Un monitor que se comporta como un semáforo, con la espera escrita con `if`: el proceso despertado no vuelve a chequear la condición. Con *signal and continue*, entre el `signal` y el momento en que el despertado vuelve a entrar, otro proceso puede pasar antes y dejar `s` en 0; el despertado resta igual y `s` queda en -1, como advierte la teoría. Hay que ejecutarlo varias veces: el error aparece en algo más de la mitad de las ejecuciones, cuando dos trabajadores escriben que entraron a la sección crítica sin que ninguno haya salido.

Resultado esperado: al terminar, `Semaforo.s` vale 1, aunque durante la ejecución haya llegado a -1.

```monitores
monitor Semaforo {
  int s = 1;
  cond pos;

  procedure P() {
    if (s == 0) wait(pos);
    s = s - 1;
  }

  procedure V() {
    s = s + 1;
    signal(pos);
  }
}

process Trabajador[id: 0..4] {
  for (1..3) {
    delay(id);             // trabaja fuera de la sección crítica
    Semaforo.P();
    write("Trabajador ", id, ": entro a la sección crítica");
    delay(1);
    write("Trabajador ", id, ": salgo");
    Semaforo.V();
  }
}
```

## Simulación de semáforos

El ejemplo anterior con `while` en lugar de `if`: `P` se duerme mientras `s` vale 0 y `V` incrementa `s` y despierta a un proceso. A diferencia de un semáforo, el proceso despertado no pasa directamente: compite por el monitor y vuelve a chequear la condición, de modo que `s` nunca queda con un valor menor a 0.

Resultado esperado: al terminar, `Semaforo.s` vale 1.

```monitores
monitor Semaforo {
  int s = 1;
  cond pos;

  procedure P() {
    while (s == 0) wait(pos);
    s = s - 1;
  }

  procedure V() {
    s = s + 1;
    signal(pos);
  }
}

process Trabajador[id: 0..4] {
  for (1..3) {
    delay(id);             // trabaja fuera de la sección crítica
    Semaforo.P();
    write("Trabajador ", id, ": entro a la sección crítica");
    delay(1);
    write("Trabajador ", id, ": salgo");
    Semaforo.V();
  }
}
```

## Passing the condition

Las personas usan el cajero en orden de llegada. Ahora el monitor administra el acceso y el uso se hace fuera de él, entre `Pasar` y `Salir`. Al salir, si hay alguien dormido se lo despierta sin marcar el cajero como libre, de modo que no pueda entrar una persona que no estaba en la cola. Como no se puede usar `empty` sobre una variable condición, la variable `esperando` cuenta los procesos dormidos. La variable condición se llama `cola`, como en la explicación.

Resultado esperado: al terminar, `Cajero.libre` vale `true` y `Cajero.esperando` vale 0.

```monitores
#define N 4

monitor Cajero {
  bool libre = true;
  cond cola;
  int esperando = 0;

  procedure Pasar() {
    if (not libre) {
      esperando++;
      wait(cola);
    }
    else libre = false;
  }

  procedure Salir() {
    if (esperando > 0) {
      esperando--;
      signal(cola);
    }
    else libre = true;
  }
}

process Persona[id: 0..N-1] {
  Cajero.Pasar();
  write("Persona ", id, ": uso el cajero");
  delay(2);                // UsarCajero()
  Cajero.Salir();
}
```

## Barrera con signal_all

Una barrera: los jugadores se duermen en `espera` hasta que llegan todos, y el último despierta al proceso `Partido`. El partido se juega una sola vez, con un único `delay`, y al terminar despierta a todos los jugadores juntos con `signal_all`. El ejercicio original tiene 22 jugadores; el ejemplo define `N` en 6 para poder seguirlos en pantalla.

Resultado esperado: al terminar, `Cancha.cant` vale 6.

```monitores
#define N 6

monitor Cancha {
  int cant = 0;
  cond espera, inicio;

  procedure llegada() {
    cant++;
    if (cant == N) signal(inicio);
    wait(espera);
  }

  procedure Iniciar() {
    if (cant < N) wait(inicio);
  }

  procedure Terminar() {
    signal_all(espera);
  }
}

process Jugador[id: 0..N-1] {
  Cancha.llegada();
  write("Jugador ", id, ": me retiro");
}

process Partido {
  Cancha.Iniciar();
  delay(9);                // se juega el partido
  Cancha.Terminar();
}
```

## Lectores y escritores (broadcast signal)

El monitor arbitra el acceso a una base de datos: varios lectores pueden leer a la vez y un escritor necesita acceso exclusivo. Los procesos avisan cuándo quieren acceder y cuándo terminaron. Al terminar de escribir se despierta a todos los lectores demorados con `signal_all` y a un escritor con `signal`.

Resultado esperado: al terminar, `Controlador_RW.nr` y `Controlador_RW.nw` valen 0.

```monitores
monitor Controlador_RW {
  int nr = 0, nw = 0;
  cond ok_leer, ok_escribir;

  procedure pedido_leer() {
    while (nw > 0) wait(ok_leer);
    nr = nr + 1;
  }

  procedure libera_leer() {
    nr = nr - 1;
    if (nr == 0) signal(ok_escribir);
  }

  procedure pedido_escribir() {
    while (nr > 0 or nw > 0) wait(ok_escribir);
    nw = nw + 1;
  }

  procedure libera_escribir() {
    nw = nw - 1;
    signal(ok_escribir);
    signal_all(ok_leer);
  }
}

process Lector[id: 0..2] {
  for (1..2) {
    Controlador_RW.pedido_leer();
    delay(2);              // lee la base de datos
    Controlador_RW.libera_leer();
  }
}

process Escritor[id: 0..1] {
  for (1..2) {
    Controlador_RW.pedido_escribir();
    delay(2);              // escribe en la base de datos
    Controlador_RW.libera_escribir();
  }
}
```

## Covering conditions: reloj lógico

Un *timer* permite a los procesos dormirse una cantidad de ticks. En cada tick se despierta a todos los procesos con `signal_all` y cada uno vuelve a chequear si llegó su hora; el que todavía no debe despertar se duerme otra vez. La teoría señala que esta solución es ineficiente y que conviene usar variables condición privadas.

Resultado esperado: al terminar, `Timer.hora_actual` vale 10.

```monitores
monitor Timer {
  int hora_actual = 0;
  cond chequear;

  procedure demorar(int intervalo) {
    int hora_de_despertar;
    hora_de_despertar = hora_actual + intervalo;
    while (hora_de_despertar > hora_actual) wait(chequear);
  }

  procedure tick() {
    hora_actual = hora_actual + 1;
    signal_all(chequear);
  }
}

process Dormilon[id: 0..2] {
  Timer.demorar(id + 2);
  write("Dormilon ", id, ": desperté");
}

process Reloj {
  for (1..10) {
    delay(1);
    Timer.tick();
  }
}
```

## Cola: pedidos en orden de llegada

Un servidor resuelve los pedidos de `N` clientes en el orden en que llegan. El monitor guarda cada pedido, una tupla con el identificador del cliente y la secuencia, en una `Cola`, que es FIFO. El servidor resuelve el pedido fuera del monitor, para que mientras tanto los demás clientes puedan encolar los suyos, y deja cada resultado en el arreglo `res`.

Resultado esperado: al terminar, la cola `Admin.C` queda vacía.

```monitores
#define N 4

monitor Admin {
  Cola C(int, text);
  cond espera;
  cond HayPedido;
  text res[N];

  procedure Pedido(IdC: in int; S: in text; R: out text) {
    push(C, (IdC, S));
    signal(HayPedido);
    wait(espera);
    R = res[IdC];
  }

  procedure Sig(IdC: out int; S: out text) {
    if (empty(C)) wait(HayPedido);
    pop(C, (IdC, S));
  }

  procedure Resultado(IdC: in int; R: in text) {
    res[IdC] = R;
    signal(espera);
  }
}

process Cliente[id: 0..N-1] {
  text S, res;
  S = "secuencia " + id;       // genera la secuencia S
  Admin.Pedido(id, S, res);
  write("Cliente ", id, ": recibí ", res);
}

process Servidor {
  text sec, res;
  int aux;
  for (1..N) {
    Admin.Sig(aux, sec);
    delay(2);                  // AnalizarSec(sec)
    res = sec + " analizada";
    Admin.Resultado(aux, res);
  }
}
```

## ColaOrdenada: primero el más corto

Una `ColaOrdenada` inserta cada elemento ordenado de menor a mayor por su primera componente. Los usuarios encolan tuplas (páginas, identificador) y la impresora retira siempre el trabajo de menos páginas, sin importar el orden en que llegaron. En el panel de monitores, la cola se ve ordenada después de cada `push`.

Resultado esperado: al terminar, `Impresion.impresos` vale 5 y la cola `Impresion.trabajos` queda vacía.

```monitores
monitor Impresion {
  ColaOrdenada trabajos(int, int);
  cond hayTrabajo;
  int impresos = 0;

  procedure pedir(id, paginas: in int) {
    push(trabajos, (paginas, id));
    signal(hayTrabajo);
  }

  procedure siguiente(id, paginas: out int) {
    if (empty(trabajos)) wait(hayTrabajo);
    pop(trabajos, (paginas, id));
    impresos++;
  }
}

process Usuario[id: 0..4] {
  int paginas = (id * 3) mod 5 + 1;
  Impresion.pedir(id, paginas);
}

process Impresora {
  int id, paginas;
  delay(8);                    // empieza cuando ya hay varios trabajos en la cola
  for (1..5) {
    Impresion.siguiente(id, paginas);
    write("imprimo ", paginas, " página(s) del usuario ", id);
    delay(paginas);
  }
}
```

## Vector de cond: variables condición privadas

Cada proceso se duerme en su propia variable condición, `turno[id]`, de un arreglo de `N`. Al liberar el recurso se retira de la cola ordenada el pedido que lo usará menos tiempo y se despierta a ese proceso en particular. Es *passing the condition* con el orden manejado explícitamente: `libre` sigue en `false` mientras el recurso pasa de un proceso a otro.

Resultado esperado: al terminar, `Shortest_Job_Next.libre` vale `true` y la cola `espera` queda vacía.

```monitores
#define N 5

monitor Shortest_Job_Next {
  bool libre = true;
  cond turno[N];
  ColaOrdenada espera(int, int);

  procedure request(int id, tiempo) {
    if (libre) libre = false;
    else {
      push(espera, (tiempo, id));      // insertar_ordenado(espera, id, tiempo)
      wait(turno[id]);
    }
  }

  procedure release() {
    int id, tiempo;
    if (empty(espera)) libre = true;
    else {
      pop(espera, (tiempo, id));       // sacar(espera, id)
      signal(turno[id]);
    }
  }
}

process Trabajo[id: 0..N-1] {
  int tiempo = (id * 3) mod 5 + 1;
  Shortest_Job_Next.request(id, tiempo);
  write("Trabajo ", id, ": uso el recurso ", tiempo, " instante(s)");
  delay(tiempo);
  Shortest_Job_Next.release();
}
```

## Prioridad: ColaOrdenada de mayor a menor

El cajero del ejercicio 2, con prioridad para las personas de más edad. La fila es una `ColaOrdenada` declarada `desc`, que ordena de mayor a menor por su primera componente, la edad. Cada persona se duerme en su variable condición privada, `espera[idP]`, porque el orden de la fila no coincide con el orden en que se durmieron: al salir se retira de la fila a la primera persona y se despierta a esa en particular.

Resultado esperado: al terminar, `Cajero.libre` vale `true`, `Cajero.esperando` vale 0 y la cola `Cajero.fila` queda vacía.

```monitores
#define N 5

monitor Cajero {
  bool libre = true;
  cond espera[N];
  int idAux, esperando = 0;
  ColaOrdenada fila(int, int) desc;

  procedure Pasar(idP, edad: in int) {
    if (not libre) {
      push(fila, edad, idP);           // insertar(fila, idP, edad)
      esperando++;
      wait(espera[idP]);
    }
    else libre = false;
  }

  procedure Salir() {
    int edad;
    if (esperando > 0) {
      esperando--;
      pop(fila, edad, idAux);          // sacar(fila, idAux)
      signal(espera[idAux]);
    }
    else libre = true;
  }
}

process Persona[id: 0..N-1] {
  int edad = 20 + (id * 37) mod 60;
  Cajero.Pasar(id, edad);
  write("Persona ", id, " (", edad, " años): uso el cajero");
  delay(3);                // UsarCajero()
  Cajero.Salir();
}
```

## Rendezvous: peluquero dormilón

El peluquero y cada cliente atraviesan una serie de etapas de sincronización: el peluquero espera que un cliente se siente en su silla, el cliente espera que le abran la puerta de salida y el peluquero espera que el cliente haya salido antes de atender al siguiente. Cada etapa usa una variable condición distinta.

Resultado esperado: al terminar, `Peluqueria.peluquero` vale 0 y `Peluqueria.cortes` vale 3.

```monitores
monitor Peluqueria {
  int peluquero = 0, cortes = 0;
  cond peluquero_disponible, silla_ocupada, puerta_abierta, salio_cliente;

  procedure corte_de_pelo() {
    while (peluquero == 0) wait(peluquero_disponible);
    peluquero = peluquero - 1;
    signal(silla_ocupada);
    wait(puerta_abierta);
    signal(salio_cliente);
  }

  procedure proximo_cliente() {
    peluquero = peluquero + 1;
    signal(peluquero_disponible);
    wait(silla_ocupada);
  }

  procedure corte_terminado() {
    cortes = cortes + 1;
    signal(puerta_abierta);
    wait(salio_cliente);
  }
}

process Cliente[id: 0..2] {
  Peluqueria.corte_de_pelo();
  write("Cliente ", id, ": me cortaron el pelo");
}

process Peluquero {
  for (1..3) {
    Peluqueria.proximo_cliente();
    delay(2);                  // corta el pelo
    Peluqueria.corte_terminado();
  }
}
```

## Vector de monitores

`monitor Caja[id: 0..2]` declara tres monitores, cada uno con sus variables permanentes y su propia exclusión mutua. Dos clientes de la misma caja nunca pagan a la vez; dos clientes de cajas distintas sí. La línea de tiempo muestra un carril por cada caja.

Resultado esperado: al terminar, `atendidos` vale 2 en `Caja[0]`, `Caja[1]` y `Caja[2]`.

```monitores
monitor Caja[id: 0..2] {
  int atendidos = 0;

  procedure pagar() {
    delay(2);                  // cobra la compra
    atendidos++;
  }
}

process Cliente[c: 0..5] {
  int caja = c mod 3;
  Caja[caja].pagar();
  write("Cliente ", c, ": pagué en la caja ", caja);
}
```

## Llamadas entre monitores

El procedure `depositar` del monitor `Cuenta` llama a un procedure del monitor `Registro`. El monitor desde donde se hizo el llamado se mantiene ocupado hasta que el procedure llamado termina por completo: mientras un cliente está en `Registro`, ningún otro puede entrar a `Cuenta`. El proceso `Auditor` muestra que también se puede competir por el segundo monitor.

Resultado esperado: al terminar, `Cuenta.saldo` vale 30 y `Registro.anotados` vale 3.

```monitores
monitor Registro {
  int anotados = 0;

  procedure anotar() {
    delay(2);                  // escribe en el registro
    anotados = anotados + 1;
  }

  procedure consultar(n: out int) {
    n = anotados;
  }
}

monitor Cuenta {
  int saldo = 0;

  procedure depositar(monto: in int) {
    saldo = saldo + monto;
    Registro.anotar();         // Cuenta sigue ocupado durante todo el llamado
  }
}

process Cliente[id: 0..2] {
  Cuenta.depositar(10);
}

process Auditor {
  int n;
  for (1..2) {
    Registro.consultar(n);
    write("depósitos anotados: ", n);
    delay(3);
  }
}
```

## Deadlock

El escritorio del ejercicio 4 antes de corregirlo. El cliente llega antes que el empleado: su `signal` no despierta a nadie y no tiene efecto posterior. Cuando el empleado llega, se duerme en `vcEmpleado` y nadie lo despierta, mientras el cliente sigue dormido en `vcCliente`. El simulador detecta que ningún proceso puede continuar e informa el *deadlock*. La corrección, una variable `listo` que indica si el cliente ya llegó, está en el ejemplo siguiente.

Resultado esperado: el programa termina en *deadlock*.

```monitores
monitor Escritorio {
  cond vcCliente, vcEmpleado;
  text datos, resultados;

  procedure Atencion(D: in text; R: out text) {
    datos = D;
    signal(vcEmpleado);        // avisa que ya dejó los datos
    wait(vcCliente);           // espera los resultados
    R = resultados;
    signal(vcEmpleado);        // avisa que ya tomó los resultados
  }

  procedure EsperarDatos(D: out text) {
    wait(vcEmpleado);          // espera que llegue el cliente
    D = datos;
  }

  procedure EnviarResultados(R: in text) {
    resultados = R;
    signal(vcCliente);         // avisa que están los resultados
    wait(vcEmpleado);          // espera que el cliente los tome
  }
}

process Cliente {
  text res;
  Escritorio.Atencion("papeles", res);
  write("Cliente: recibí ", res);
}

process Empleado {
  text datos, res;
  delay(6);                    // llega al escritorio después que el cliente
  Escritorio.EsperarDatos(datos);
  res = datos + " resueltos";
  Escritorio.EnviarResultados(res);
}
```

## Problema completo: banco y escritorios

Tres empleados atienden a `N` clientes en orden de llegada. El monitor `Banco` ordena a los clientes y le asigna a cada uno un empleado, con una cola de empleados libres y *passing the condition* sobre `cantLibres`. Cada empleado atiende en su propio monitor `Escritorio`, donde la variable `listo` evita el *deadlock* del ejemplo anterior. Reúne colas, vector de monitores y parámetros `in` y `out`.

Resultado esperado: al terminar, `Banco.esperando` y `Banco.cantLibres` valen 0 y la cola `Banco.elibres` queda vacía.

```monitores
#define N 6

monitor Banco {
  Cola elibres(int);
  cond esperaC;
  int esperando = 0, cantLibres = 0;

  procedure Llegada(idE: out int) {
    if (cantLibres == 0) {
      esperando++;
      wait(esperaC);
    }
    else cantLibres--;
    pop(elibres, idE);
  }

  procedure Proximo(idE: in int) {
    push(elibres, idE);
    if (esperando > 0) {
      esperando--;
      signal(esperaC);
    }
    else cantLibres++;
  }
}

monitor Escritorio[id: 0..2] {
  cond vcCliente, vcEmpleado;
  text datos, resultados;
  bool listo = false;

  procedure Atencion(D: in text; R: out text) {
    datos = D;
    listo = true;              // marca que llegó el cliente
    signal(vcEmpleado);
    wait(vcCliente);
    R = resultados;
    signal(vcEmpleado);
  }

  procedure EsperarDatos(D: out text) {
    if (not listo) wait(vcEmpleado);   // sólo se duerme si el cliente no llegó
    D = datos;
  }

  procedure EnviarResultados(R: in text) {
    resultados = R;
    signal(vcCliente);
    wait(vcEmpleado);
    listo = false;             // resetea para atender al próximo cliente
  }
}

process Cliente[id: 0..N-1] {
  int idE;
  text papel, res;
  papel = "papeles de " + id;
  Banco.Llegada(idE);
  Escritorio[idE].Atencion(papel, res);
  write("Cliente ", id, ": me atendió el empleado ", idE);
}

process Empleado[id: 0..2] {
  text datos, res;
  for (1..2) {
    Banco.Proximo(id);
    Escritorio[id].EsperarDatos(datos);
    res = datos + ": resuelto";    // resuelve la solicitud en base a datos
    Escritorio[id].EnviarResultados(res);
  }
}
```
