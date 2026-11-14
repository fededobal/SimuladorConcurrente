# Monitores

```c
monitor Nombre {
    <variables permanentes>
    <variables condición>
    <sentencias de inicialización>   // opcional, corren una vez al arrancar
    <procedures>
}
```

El orden de los miembros es libre. Las permanentes y las `cond` solo se ven adentro del
monitor. Las sentencias sueltas en el cuerpo son el código de inicialización y no pueden
llamar a otro monitor ni usar `wait`, `signal` o `delay`. Si la inicialización no termina
en 100 000 pasos (por ejemplo, un `while (true)`), el programa no arranca y se informa el
error.

## Arreglos de monitores

```c
monitor Escritorio[id: 0..2] {
    cond vcCliente;
    text datos;
    procedure atencion(D: in text; R: out text) { ... }
}

process Cliente[c: 0..5] {
    int idE; text res;
    ...
    Escritorio[idE].atencion("papel", res);
}
```

Declara un monitor por índice (`Escritorio[0]`, `Escritorio[1]`, `Escritorio[2]`), cada uno
con sus propias variables permanentes, `cond` y cola de entrada. Adentro, `id` vale el
índice de ese monitor y es de solo lectura. Las llamadas llevan el índice, que puede ser
cualquier expresión `int`; un índice fuera del rango es error de ejecución. Llamar sin
índice a un arreglo de monitores, o con índice a un monitor común, es error de compilación.
Se admiten hasta 1000 monitores por arreglo.

## Variables condición

```c
cond libre;
cond libre, ocupado;   // varias en una línea
cond turno[3];         // arreglo de condiciones (condiciones privadas)
```

Si la `cond` es un arreglo hay que indexarla siempre: `wait(turno[i])`, `signal(turno[i])`.
Las operaciones `wait`, `signal` y `signal_all` se describen en
[su página](./instrucciones/wait-signal).

## Procedures

```c
procedure depositar(d: in int) { ... }
procedure retirar(r: out int) { ... }
procedure mirar(x: int) { ... }                      // sin modo = in
procedure nada() { ... }
procedure Pasar(idP, edad: in int; R: out text) { ... } // grupos con ';'
procedure request(int id, tiempo; text nombre) { ... }  // estilo C: siempre in
```

- Los grupos de parámetros se separan con `;`; la coma separa nombres del mismo modo y
  tipo. `(a: in int, b: in int)` es error: se escribe `(a, b: in int)` o
  `(a: in int; b: in int)`.
- `in` (por defecto): solo lectura, asignarle adentro es error.
- `out`: se copia al argumento del llamador al retornar.
- El argumento de un `out` tiene que ser una variable o un elemento de arreglo asignable;
  `M.dar(3)` es error.
- Los parámetros son escalares: no se pasan arreglos ni colas.
- El tipo del argumento tiene que coincidir con el del parámetro, con las conversiones de
  [Tipos](./tipos). En un `out` el valor va del parámetro al argumento:
  `procedure dar(r: out int)` puede devolver a una variable `int`, `double` o `text`, pero
  no a una `bool`.
- No hay valor de retorno; los resultados salen por `out`.
- Un procedure no puede llamar a otro de su propio monitor (error de compilación). Sí puede
  llamar a otro monitor, y conserva el suyo hasta que esa llamada termina, aunque haga
  `wait` en el otro (ver [Llamadas entre monitores](/monitores/llamadas-entre-monitores)).
