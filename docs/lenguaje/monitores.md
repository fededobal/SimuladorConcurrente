# Monitores

```c
monitor Nombre {
    <variables permanentes>
    <variables condición>
    <sentencias de inicialización>   // opcional, corren una vez al arrancar
    <procedures>
}
```

| Regla | Detalle |
|---|---|
| orden libre | permanentes, `cond`, inicialización y procedures pueden ir en cualquier orden |
| visibilidad | las permanentes y las `cond` solo se ven adentro del monitor |
| inicialización | las sentencias sueltas del cuerpo; corren una vez, antes de que nadie use el monitor |
| límites de la inicialización | no puede llamar a otro monitor ni usar `wait`, `signal` o `delay`; si no termina en 100 000 pasos, el programa no arranca |

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

| Regla | Detalle |
|---|---|
| un monitor por índice | `Escritorio[0]`, `Escritorio[1]`, `Escritorio[2]`, cada uno con sus variables, `cond` y cola de entrada |
| `id` adentro | vale el índice de ese monitor; es de solo lectura |
| la llamada lleva el índice | cualquier expresión `int`; fuera del rango es error de ejecución |
| errores de compilación | llamar sin índice a un arreglo de monitores, o con índice a un monitor común |
| tope | 1000 monitores por arreglo |

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
  `wait` en el otro: mientras tanto nadie más entra al primero. Si el proceso espera en el
  segundo algo que solo puede hacer otro proceso que necesita entrar al primero, nadie
  avanza y el simulador informa el interbloqueo con los monitores que retiene cada uno.
