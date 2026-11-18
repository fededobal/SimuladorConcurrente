# 0009. Declarar las cantidades como `N` con constantes del compilador

- Estado: aceptada
- Fecha: 2026-11-18

## Contexto
Los programas de la cátedra usan cantidades fijas con nombre: `Process Persona[id: 0..N-1]`,
`cond espera[N]`, `text res[N]`, `typeT buf[n]` (Teoría 4 y Explicación 3). El lenguaje del
simulador no tenía cómo declararlas: no hay variables globales, y los límites de una familia
de procesos o el tamaño de un arreglo se escribían con números. Cada programa del material
había que reescribirlo reemplazando `N` a mano en todos los lugares, y el mensaje que recibía
el alumno al pegarlo tal cual era `Nombre no declarado en este alcance: N`.

La restricción de fondo se mantiene: el estado compartido solo vive dentro de un monitor
(«no existen las variables compartidas», Explicación 3). Lo que se agregue no puede ser una
variable global ni parecerlo.

## Alternativas
1. **Una directiva en el texto del programa** (`#define N 5`). El valor viaja con el archivo
   `.mon`, con el enlace para compartir y con los ejemplos; los tests compilan el mismo texto
   que ve el alumno. Agrega líneas que la cátedra no escribe.
2. **Un panel de ajustes en la interfaz**, fuera del código. El programa queda idéntico al de
   la cátedra, pero el texto solo deja de alcanzar para compilar: habría que guardar los
   valores junto al programa, en el enlace, en los `.mon` y en cada test.
3. **Las dos cosas**: la directiva es lo que se guarda, y un menú de la interfaz edita esas
   líneas.
4. **Una declaración `const N = 5;` de nivel superior.** Se lee como una variable global de
   solo lectura, que es lo que el modelo evita.

## Decisión
Se adopta la alternativa 3. Una constante se declara con `#define NOMBRE valor`, una por
línea, al principio del programa (puede haber comentarios antes) y con un entero sin signo
como valor. El lexer entrega el número en cada lugar donde aparece el nombre, de modo que el
parser, el validador y la máquina virtual no conocen las constantes: no ocupan memoria ni
figuran en el estado. Declarar de nuevo el nombre o asignarle un valor es error de
compilación, con un mensaje que dice que es una constante.

El menú **Constantes** del encabezado del editor lee esas líneas y las reescribe; no guarda
nada por su cuenta.

## Consecuencias
- Los programas de la cátedra con `N` compilan agregando una línea. Lo verifican
  `CompilerTest.constantsStandForNumbers` y `TheoryNotationTest`, y un caso del smoke del
  motor compilado.
- El nombre de una constante deja de poder usarse como nombre de variable, proceso o monitor
  en ese programa.
- Las constantes solo valen enteros sin signo: no hay constantes de texto ni expresiones
  (`#define M N*2`). Si hicieran falta, se agregan sin cambiar la forma.
- El resaltado del editor y de la guía reconoce `#define` y colorea el nombre de una
  constante como un número.
- La directiva tiene sintaxis de C dentro de un lenguaje que no es C; se eligió porque dice
  por sí misma que es una instrucción para el compilador y no una declaración.
