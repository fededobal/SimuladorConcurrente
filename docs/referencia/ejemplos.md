# Programas de ejemplo

Son los programas que ofrece el menú Ejemplos del simulador. Los nueve se ejecutan en los tests del núcleo con 25 semillas distintas y en ronda, y tienen que terminar como indica su segunda línea (`// espera: ...`): el resultado esperado de cada corrida forma parte de la verificación del simulador.

## Productor y consumidor

Un buffer de un dato con dos variables condición. El productor espera en `libre` mientras hay un dato sin retirar y el consumidor en `ocupado` mientras no lo hay. Termina con `dato` en 5 y `hayDato` en falso.

Resultado esperado: `fin Buffer.dato=5 Buffer.hayDato=false`.

```c
monitor Buffer {
  int dato = 0;
  bool hayDato = false;
  cond libre, ocupado;

  procedure depositar(d: in int) {
    while (hayDato) wait(libre);
    dato = d;
    hayDato = true;
    signal(ocupado);
  }

  procedure retirar(r: out int) {
    while (not hayDato) wait(ocupado);
    r = dato;
    hayDato = false;
    signal(libre);
  }
}

process Productor {
  int i = 1;
  while (i <= 5) {
    Buffer.depositar(i);
    write("deposite ", i);
    i++;
  }
}

process Consumidor {
  int x = 0;
  int n = 0;
  while (n < 5) {
    Buffer.retirar(x);
    write("retire ", x);
    n++;
  }
}
```

## Exclusión mutua implícita

Cuatro procesos suman uno al mismo contador. `dentro` cuenta cuántos procesos están ejecutando el procedure a la vez y `maxDentro` guarda el máximo: siempre termina en 1, corran los procesos como corran.

Resultado esperado: `fin Cuenta.x=4 Cuenta.maxDentro=1`.

```c
monitor Cuenta {
  int x = 0;
  int dentro = 0;
  int maxDentro = 0;

  procedure sumar() {
    dentro = dentro + 1;
    if (dentro > maxDentro) maxDentro = dentro;
    x = x + 1;
    dentro = dentro - 1;
  }
}

process P[i: 0..3] {
  Cuenta.sumar();
}
```

## Barrera con `signal_all`

Cinco trabajadores esperan en `puerta` hasta que el portero la abre con un solo `signal_all`. Los cinco se despiertan y pasan a competir por el monitor.

Resultado esperado: `fin Barrera.pasaron=5`.

```c
monitor Barrera {
  bool abierta = false;
  int pasaron = 0;
  cond puerta;

  procedure esperar() {
    while (not abierta) wait(puerta);
    pasaron = pasaron + 1;
  }

  procedure abrir() {
    abierta = true;
    signal_all(puerta);
  }
}

process Trabajador[i: 0..4] {
  Barrera.esperar();
}

process Portero {
  Barrera.abrir();
}
```

## Parámetros `out`

El procedure `verificar` devuelve el valor del contador por un parámetro `out`. Según el entrelazado, el proceso `Chequeo` lee valores distintos en cada corrida.

Resultado esperado: `fin TOTAL.cant=3`.

```c
monitor TOTAL {
  int cant = 0;

  procedure incrementar() {
    cant = cant + 1;
  }

  procedure verificar(R: out int) {
    R = cant;
  }
}

process Suma {
  for (int i = 1..3) {
    TOTAL.incrementar();
  }
}

process Chequeo {
  int leido = 0;
  TOTAL.verificar(leido);
  write("leí ", leido);
  TOTAL.verificar(leido);
  write("leí ", leido);
}
```

## Cola FIFO dentro del monitor

Una `Cola(int)` como buffer sin límite. El consumidor espera en `noVacio` mientras la cola está vacía; `empty` es la guarda del `while`.

Resultado esperado: `fin BufferN.suma=100`.

```c
monitor BufferN {
  Cola items(int);
  int suma = 0;
  cond noVacio;

  procedure poner(v: in int) {
    push(items, v);
    signal(noVacio);
  }

  procedure sacar() {
    while (empty items) wait(noVacio);
    int x = 0;
    pop(items, x);
    suma = suma + x;
  }
}

process Productor {
  for (int i = 1..4) {
    BufferN.poner(i * 10);
  }
}

process Consumidor {
  for (int i = 1..4) {
    BufferN.sacar();
  }
}
```

## ColaOrdenada

Se encolan 3, 1 y 2; el primer `pop` devuelve 1 porque la `ColaOrdenada` inserta ordenado por el valor.

Resultado esperado: `fin Turnos.primero=1`.

```c
monitor Turnos {
  ColaOrdenada pendientes(int);
  int primero = 0;

  procedure cargar() {
    push(pendientes, 3);
    push(pendientes, 1);
    push(pendientes, 2);
  }

  procedure atender() {
    pop(pendientes, primero);
  }
}

process Recepcion {
  Turnos.cargar();
  Turnos.atender();
}
```

## Interbloqueo

Un proceso hace `wait` en una condición que nadie va a señalar. El simulador informa el interbloqueo.

Resultado esperado: `deadlock`.

```c
monitor M {
  cond c;

  procedure bloquear() {
    wait(c);
  }
}

process P {
  M.bloquear();
}
```

## Corralón (punto 4a de la práctica)

Diez clientes y un empleado. El cliente encola su pedido y se duerme en su propia variable condición, `esperaCli[id]`; el empleado lo atiende, espera la lista y entrega el comprobante. Usa una cola de enteros, arreglos de `cond` y parámetros `in` y `out`.

Resultado esperado: `fin Corralon.cAtenciones=<>`.

```c
monitor Corralon {
  Cola cAtenciones(int);
  cond esperaEmp, esperaCli[10], esperaListas[10];
  text comprobantes[10];
  text listas;
  
  procedure comprar(id: in int; lista: in text; comp: out text) {
    push(cAtenciones,id); // pido atención del empleado
    signal(esperaEmp);
    wait(esperaCli[id]);
    listas = lista; // me atiende y entrego la lista
    signal(esperaListas[id]);
    wait(esperaCli[id]);
    comp = comprobantes[id]; // recibo comprobante
  }
  
  procedure esperarCliente(id: out int; lista: out text) {
    while(empty cAtenciones) {
      wait(esperaEmp);
    }
    pop(cAtenciones,id);
    signal(esperaCli[id]); // atiendo cliente
    wait(esperaListas[id]); // recibo lista del cliente
    lista = listas;
  }
  
  procedure entregarComprobante(id: in int; comp: in text) {
    comprobantes[id] = comp;
    signal(esperaCli[id]);
  }
}

process Empleado {
  text lista;
  text comp;
  int id;
  for(int i = 1..10) {
    Corralon.esperarCliente(id,lista);
    // genera comprobante
    comp = "comp";
    Corralon.entregarComprobante(id,comp);
  }
}

process Cliente[id: 0..9] {
  text lista = "lista";
  text comp;
  Corralon.comprar(id,lista,comp);
}
```

## Guardia: ColaOrdenada con tuplas

Los pacientes se encolan como tuplas (gravedad, id) en una `ColaOrdenada` y el médico atiende siempre al más grave; a igual gravedad, al que llegó antes. Como el `signal` puede llegar antes que el `wait`, cada paciente espera sobre un `bool` propio.

Resultado esperado: `fin Guardia.atendidos=6`.

```c
monitor Guardia {
  ColaOrdenada espera(int, int);   // (gravedad, id): 1 es lo más urgente
  cond hayPaciente, turno[6];
  bool atendido[6];                // uno por paciente: el signal puede llegar antes del wait
  int atendidos = 0;

  procedure llegar(id: in int; gravedad: in int) {
    push(espera, (gravedad, id));  // se inserta ordenado por la gravedad
    signal(hayPaciente);
    while (not atendido[id]) wait(turno[id]);
  }

  procedure siguiente(id: out int; gravedad: out int) {
    while (empty espera) wait(hayPaciente);
    pop(espera, (gravedad, id));   // sale el más grave; a igual gravedad, el que llegó antes
    atendido[id] = true;
    atendidos++;
    signal(turno[id]);
  }
}

process Paciente[id: 0..5] {
  int gravedad = (id * 7) mod 3 + 1;   // 1, 2 o 3 según el paciente
  write("llega con gravedad ", gravedad);
  Guardia.llegar(id, gravedad);
  write("me atienden");
}

process Medico {
  int id;
  int gravedad;
  for (int i = 0; i < 6; i++) {
    Guardia.siguiente(id, gravedad);
    write("atiendo al paciente ", id, " (gravedad ", gravedad, ")");
  }
}
```
