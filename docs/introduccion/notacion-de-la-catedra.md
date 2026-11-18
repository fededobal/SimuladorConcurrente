# Notación de la cátedra

Los programas del material de teoría y de práctica de Programación Concurrente, la materia
en la que se basa el simulador, están pensados para leerse, no para ejecutarse: usan
funciones sin definir, constantes como `N` y algunas abreviaturas. Esta página indica cómo
se escribe cada una de esas formas para que el simulador las acepte. Las que no figuran acá
se escriben igual que en ese material.

## Formas aceptadas tal cual

| En las clases | Observación |
|---|---|
| `Monitor`, `Procedure`, `Process`, `OR`, `AND`, `OUT`, `colaOrdenada` | Las [palabras reservadas](/lenguaje/palabras-reservadas) no distinguen mayúsculas |
| `cond cola;`, `wait(cola);` | `cola` es el tipo solo cuando declara una cola; como nombre de una variable se acepta |
| `if (s == 0) wait(pos) else s = s-1;` | Si el cuerpo del `if` es una sola sentencia, puede ir seguida del `else` sin `;` ([`if`](/lenguaje/instrucciones/if)) |
| `cond espera[N];`, `text res[N];`, `Process Persona[id: 0..N-1]` | Con una línea `#define N 5` al principio del programa ([Constantes](/lenguaje/constantes)) |
| `v_actual :=: v_proxima;` | Intercambio de dos variables del mismo tipo ([`:=:`](/lenguaje/instrucciones/intercambio)) |
| `procedure Pasar(idP, edad: in int; R: out text)` | Grupos de parámetros separados por `;` |
| `procedure request(int id, tiempo)` | Parámetros al estilo C; son de entrada (`in`) |
| `cant ++;` | El espacio antes de `++` es válido |
| `Banco.Próximo(id);` | Los nombres admiten letras con tilde |
| `while (true) { ... }` | Ciclo infinito; el proceso no termina |
| `if (hayDato) wait(P);` | La espera se puede escribir con `if` o con `while` ([Variables condición](/ejecucion/variables-condicion#espera-con-while-o-con-if)) |

## Formas que se escriben distinto

| En las clases | En el simulador | Motivo |
|---|---|---|
| `if (not libre) → wait(cola);` | `if (not libre) wait(cola);` | La flecha no forma parte del lenguaje |
| `cola fila;` | `Cola fila(int);` | Toda cola declara el tipo de sus componentes ([Colas](/lenguaje/colas)) |
| `Cola C;` y `push(C, (idC, S));` | `Cola C(int, text);` | Una tupla declara un tipo por componente |
| `colaOrdenada fila;`, ordenada de mayor a menor | `ColaOrdenada fila(int, int) desc;` | El orden se indica al declarar la cola; sin `desc`, ordena de menor a mayor |
| `insertar(fila, idP, edad);` | `push(fila, edad, idP);` | La `ColaOrdenada` ordena por la primera componente: la clave va adelante |
| `sacar(fila, idAux);` | `pop(fila, edad, idAux);` | `pop` recibe una variable por componente |
| `verPrimero(dormidos)` | No tiene equivalente | Para consultar la clave del frente hay que desencolar |
| `UsarCajero();` | `delay(2);` o `skip;` | No existen funciones: el uso de un recurso se representa con una demora o con un paso vacío |
| `R = AnalizarSec(S);` | `R = S + " analizada";` | Ídem; se reemplaza por una expresión |
| `delay(90minutos);` | `delay(90);` | `delay` recibe una cantidad de instantes, de 0 a 3600, sin unidad |
| `--genera el valor` | `// genera el valor` | Los comentarios empiezan con `//` o van entre `/*` y `*/` |
| `....` o `……` | Se omite | No hay sentencia de relleno; `skip;` ocupa un paso sin hacer nada |
| `boolean listo = false;` | `bool listo = false;` | El tipo se llama `bool` |
| `typeT buf[n];` | `int buf[n];` | No hay tipos genéricos; `n` se declara con `#define n 5` |
| `procedure retirar(typeT &resultado)` | `procedure retirar(resultado: out int)` | Los resultados salen por parámetros `out` |
| `elseif (cil > posicion)` | `else if (cil > posicion)` | `elseif` no es una palabra del lenguaje |
| `procedure P() { ... };` | `procedure P() { ... }` | Después de la llave de cierre no va `;` |
| `Procedure uno() int x; { ... }` | `procedure uno() { int x; ... }` | Las variables locales se declaran dentro del cuerpo |

## Formas que no tienen equivalente

La teoría presenta operaciones sobre variables condición que, como aclara la propia cátedra,
no se usan en la práctica. El simulador las rechaza con un mensaje que lo indica, y se
reemplazan con las técnicas de las clases:

| En las clases | Mensaje | Reemplazo |
|---|---|---|
| `empty(cv)` | `En la práctica no se permite preguntar si una variable condición está vacía` | Una variable entera que cuente los procesos dormidos en `cv`, como en el ejercicio 2 de la Explicación 3 |
| `wait(cv, rank)` | `En la práctica no se permite el wait con prioridad (wait(cv, rank)): se escribe wait(cv)` | Una `ColaOrdenada` y variables condición privadas (`cond espera[N];`), como en el ejercicio 3 |
| `minrank(cv)` | Error de sintaxis | La clave del primer elemento de esa `ColaOrdenada` |

## Mayúsculas en los nombres

Las palabras reservadas aceptan cualquier combinación de mayúsculas, pero los nombres que
declara el programa no: `IdC` e `idC` son dos nombres distintos, y si el procedure se
declara `Llegada`, la llamada `Banco.llegada(idE)` no lo encuentra. Algunos programas de las
clases mezclan ambas formas; en el simulador hay que elegir una y usarla siempre. El mensaje
que aparece en ese caso está en [Errores de compilación](/problemas/errores-de-compilacion).
