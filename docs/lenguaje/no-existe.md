# Qué no existe

Fuera del alcance de esta versión, a propósito:

- Semáforos: `sem`, `P`, `V`. Bloque atómico `< >`. `await`. No están reservados: son
  nombres libres.
- *Signal and wait*, `signal` con prioridad, `minrank`, `empty(cv)` sobre una condición.
- Sacar de una `ColaOrdenada` por otro criterio que no sea la primera componente.
- `break`, `continue`, `return`.
- Funciones o procedures fuera de un monitor; recursión.
- El modo de parámetro `inout`: solo `in` y `out`.
- Variables globales, mutables o constantes.
- Secuencias de escape en las cadenas (`\"`, `\n`): una comilla doble no puede ir dentro de
  un texto.
- Arreglos o colas como parámetro de un procedure.
- Arreglos multidimensionales.
- Pasaje de mensajes, `send`/`receive`.

La decisión de limitar el alcance a monitores está registrada en
[ADR 0003](/decisiones/0003-alcance-solo-monitores).
