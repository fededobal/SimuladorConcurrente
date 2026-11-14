# Ejemplos canónicos

Los programas de esta página son casos de prueba del simulador: se ejecutan en los tests
del núcleo con varias semillas.

## Contador compartido

```c
monitor TOTAL {
    int cant = 0;
    procedure incrementar() { cant = cant + 1; }
    procedure verificar(R: out int) { R = cant; }
}

process empleado[id: 0..4] {
    while (true) { TOTAL.incrementar(); }
}
process coordinador {
    int c;
    while (true) { TOTAL.verificar(c); }
}
```

Muestra la **exclusión mutua implícita**: nunca hay dos procesos dentro de `TOTAL`.

## Buffer de un dato

```c
monitor Buffer {
    int dato;
    bool hayDato = false;
    cond P, C;
    procedure Enviar(D: in int) {
        if (hayDato) wait(P);
        dato = D; hayDato = true;
        signal(C);
    }
    procedure Recibir(R: out int) {
        if (not hayDato) wait(C);
        R = dato; hayDato = false;
        signal(P);
    }
}
```

## Buffer limitado (condición en `while`)

```c
monitor BufferLimitado {
    int N = 5;
    int buf[5];
    int ocupado = 0, libre = 0, cantidad = 0;
    cond notLleno, notVacio;
    procedure depositar(dato: in int) {
        while (cantidad == N) wait(notLleno);
        buf[libre] = dato; libre = (libre + 1) mod N; cantidad++;
        signal(notVacio);
    }
    procedure retirar(res: out int) {
        while (cantidad == 0) wait(notVacio);
        res = buf[ocupado]; ocupado = (ocupado + 1) mod N; cantidad--;
        signal(notLleno);
    }
}
```

## Lectores y escritores (*broadcast*)

```c
monitor ControladorRW {
    int nr = 0, nw = 0;
    cond okLeer, okEscribir;
    procedure pedidoLeer()  { while (nw > 0) wait(okLeer); nr++; }
    procedure liberaLeer()  { nr--; if (nr == 0) signal(okEscribir); }
    procedure pedidoEscribir() { while (nr > 0 or nw > 0) wait(okEscribir); nw++; }
    procedure liberaEscribir() { nw--; signal(okEscribir); signal_all(okLeer); }
}
```

`signal_all(okLeer)` despierta a todos los lectores demorados.

Los programas completos que ofrece el menú Ejemplos del simulador están en
[Programas de ejemplo](/referencia/ejemplos).
