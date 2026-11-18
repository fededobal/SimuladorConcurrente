# Constantes

Los enunciados de la materia usan cantidades fijas con nombre: `N` personas, un arreglo
`res[N]`, una familia `Persona[id: 0..N-1]`. En el simulador esas cantidades se declaran como
constantes del programa, con una línea `#define` por cada una.

## Sintaxis

```monitores
#define N 5
#define Empleados 3   // admite un comentario al final

monitor Admin {
  cond espera[N];
  text res[N];
  ...
}

process Cliente[id: 0..N-1] { ... }
```

## Funcionamiento

Una constante no es una variable, ni global ni compartida: es un ajuste del compilador. Antes
de compilar, cada aparición del nombre se reemplaza por su número, de modo que
`cond espera[N];` se compila como `cond espera[5];`. Por eso una constante puede usarse en
cualquier lugar donde va un número (el tamaño de un arreglo, el rango de una familia de
procesos o de un arreglo de monitores, una condición, un `delay`) y no ocupa memoria ni
aparece entre las variables de los monitores o de los procesos.

| Regla | Detalle |
|---|---|
| Ubicación | Al principio del programa, antes de los monitores y los procesos; puede haber comentarios antes |
| Forma | Una constante por línea, sin `;` al final |
| Nombre | Como el de una variable; distingue mayúsculas (`N` y `n` son dos nombres) y no puede ser una palabra reservada |
| Valor | Un número entero sin signo |
| Uso | El nombre no se puede declarar de nuevo ni recibir una asignación |

## Menú Constantes

El botón **Constantes**, en el encabezado del editor, muestra las constantes del programa y
permite agregarlas, cambiarles el nombre o el valor y quitarlas sin escribir las líneas a
mano. El menú edita las líneas `#define` del código: el programa sigue siendo un solo texto,
que es lo que se guarda, se descarga y se comparte con un enlace
([Editor](/interfaz/editor#constantes)).

## Errores

| Situación | Mensaje |
|---|---|
| Después de un monitor o un proceso | `Las constantes (#define) se escriben al principio del programa, antes de los monitores y los procesos` |
| Sin valor, con signo o con decimales | `La constante 'N' necesita un valor entero sin signo, por ejemplo #define N 5` |
| Con `;` u otro texto al final | `Después del valor de la constante 'N' no va nada más en la línea (un #define no lleva ';')` |
| Nombre repetido | `La constante 'N' ya está definida` |
| Nombre reservado | `'while' es una palabra reservada: no puede ser el nombre de una constante` |
| Declararla o asignarle un valor | `'N' es una constante del programa (#define N 5): no se puede usar como nombre ni cambiarle el valor` |
| Otra directiva | `Directiva desconocida '#include': la única es #define, por ejemplo #define N 5` |

## Ejemplo

```monitores
#define N 4

monitor Cancha {
  int cant = 0;
  cond espera;

  procedure llegada() {
    cant++;
    if (cant < N) wait(espera);
    else signal_all(espera);
  }
}

process Jugador[id: 0..N-1] {
  Cancha.llegada();
  write("Jugador ", id, ": llegaron los ", N);
}
```
