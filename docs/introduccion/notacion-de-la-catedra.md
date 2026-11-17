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
| `v_actual :=: v_proxima;` | Intercambio de dos variables del mismo tipo ([`:=:`](/lenguaje/instrucciones/intercambio)) |
| `procedure Pasar(idP, edad: in int; R: out text)` | Grupos de parámetros separados por `;` |
| `procedure request(int id, tiempo)` | Parámetros al estilo C; son de entrada (`in`) |
| `cant ++;` | El espacio antes de `++` es válido |
| `Banco.Próximo(id);` | Los nombres admiten letras con tilde |
| `while (true) { ... }` | Ciclo infinito; el proceso no termina |

## Formas que se escriben distinto

| En las clases | En el simulador | Motivo |
|---|---|---|
| `if (not libre) → wait(cola);` | `if (not libre) wait(cola);` | La flecha no forma parte del lenguaje |
| `cola fila;` | `Cola fila(int);` | Toda cola declara el tipo de sus componentes ([Colas](/lenguaje/colas)) |
| `Cola C;` y `push(C, (idC, S));` | `Cola C(int, text);` | Una tupla declara un tipo por componente |
| `insertar(fila, idP, edad);` | `push(fila, edad, idP);` | La `ColaOrdenada` ordena por la primera componente, de menor a mayor |
| `sacar(fila, idAux);` | `pop(fila, edad, idAux);` | `pop` recibe una variable por componente |
| `verPrimero(dormidos)` | No tiene equivalente | Para consultar la clave del frente hay que desencolar |
| `Process Persona[id: 0..N-1]` | `process Persona[id: 0..4]` | `N` no está declarada: los límites son números o expresiones con números |
| `text res[N];` | `text res[5];` | Ídem |
| `UsarCajero();` | `delay(2);` o `skip;` | No existen funciones: el uso de un recurso se representa con una demora o con un paso vacío |
| `R = AnalizarSec(S);` | `R = S + " analizada";` | Ídem; se reemplaza por una expresión |
| `delay(90minutos);` | `delay(90);` | `delay` recibe una cantidad de instantes, de 0 a 3600, sin unidad |
| `--genera el valor` | `// genera el valor` | Los comentarios empiezan con `//` o van entre `/*` y `*/` |
| `....` o `……` | Se omite | No hay sentencia de relleno; `skip;` ocupa un paso sin hacer nada |
| `boolean listo = false;` | `bool listo = false;` | El tipo se llama `bool` |
| `typeT buf[n];` | `int buf[5];` | No hay tipos genéricos |
| `procedure retirar(typeT &resultado)` | `procedure retirar(resultado: out int)` | Los resultados salen por parámetros `out` |
| `elseif (cil > posicion)` | `else if (cil > posicion)` | `elseif` no es una palabra del lenguaje |
| `procedure P() { ... };` | `procedure P() { ... }` | Después de la llave de cierre no va `;` |
| `Procedure uno() int x; { ... }` | `procedure uno() { int x; ... }` | Las variables locales se declaran dentro del cuerpo |
| `cond cola;` | `cond espera;` | `cola` es una palabra reservada |

## Formas que no tienen equivalente

La teoría presenta operaciones sobre variables condición que, como aclara la propia cátedra,
no se usan en la práctica. El simulador las rechaza y se reemplazan con las técnicas de las
clases:

| En las clases | Reemplazo |
|---|---|
| `empty(cv)` | Una variable entera que cuente los procesos dormidos en `cv`, como en el ejercicio 2 de la Explicación 3 |
| `wait(cv, rank)` y `minrank(cv)` | Una `ColaOrdenada` y una variable condición privada por proceso (`cond espera[5];`), como en el ejercicio 3 |

## Mayúsculas en los nombres

Las palabras reservadas aceptan cualquier combinación de mayúsculas, pero los nombres que
declara el programa no: `IdC` e `idC` son dos nombres distintos, y si el procedure se
declara `Llegada`, la llamada `Banco.llegada(idE)` no lo encuentra. Algunos programas de las
clases mezclan ambas formas; en el simulador hay que elegir una y usarla siempre. El mensaje
que aparece en ese caso está en [Errores de compilación](/problemas/errores-de-compilacion).
