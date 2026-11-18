# 0010. Elegir el orden de una `ColaOrdenada` al declararla

- Estado: aceptada
- Fecha: 2026-11-18

## Contexto
Una `ColaOrdenada` insertaba siempre de menor a mayor por su primera componente. Alcanza
para dos usos de la cátedra: la alocación SJN (primero el que usará menos tiempo) y el reloj
lógico (primero la hora de despertar más próxima). El ejercicio 3 de la Explicación 3 pide
lo contrario: en el cajero con prioridad, la fila se ordena «por edad de mayor a menor». La
guía indicaba traducir `insertar(fila, idP, edad)` como `push(fila, edad, idP)`, que con el
orden ascendente atendía primero a la persona más joven.

## Alternativas
1. **No cambiar el lenguaje y encolar la clave negada** (`push(fila, -edad, idP)`). No agrega
   nada, pero la cola muestra edades negativas y el `pop` devuelve una clave que hay que
   volver a negar.
2. **Un modificador en la declaración**: `ColaOrdenada fila(int, int) desc;`. El orden es una
   propiedad de la cola, como en el enunciado, y `push` y `pop` no cambian.
3. **Un tipo nuevo** (`ColaOrdenadaDesc`). Equivale a la anterior con una palabra reservada
   larga y un caso más en cada lugar donde se trata el tipo.
4. **Indicar el orden en cada `push`.** Permitiría mezclar órdenes en una misma cola, que no
   tiene sentido.

## Decisión
Se adopta la alternativa 2. Después de los tipos, la declaración admite `asc` o `desc`; sin
ninguna de las dos, la cola ordena de menor a mayor, de modo que los programas existentes no
cambian. `desc` ordena de mayor a menor. En los dos casos la inserción es estable: a igual
clave sale primero el que se encoló antes. En una `Cola`, que no ordena, escribir `asc` o
`desc` es error de compilación.

## Consecuencias
- `asc` y `desc` pasan a ser palabras reservadas (33 en total) y dejan de poder usarse como
  nombres.
- El estado muestra el orden en el tipo de la variable (`ColaOrdenada(int, int) desc`).
- El ejercicio 3 se escribe como en la cátedra; es el ejemplo «Prioridad: ColaOrdenada de
  mayor a menor». Lo verifican `TheoryNotationTest.descendingSortedQueuePopsLargestKeyFirst`
  y un caso del smoke.
- Sigue sin existir `verPrimero`: para consultar la clave del frente hay que desencolar.
