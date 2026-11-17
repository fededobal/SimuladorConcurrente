# `delay`

Demora al proceso una cantidad de instantes.

## Sintaxis

```monitores
delay(5);
delay(t * 2);    // cualquier expresión int, de 0 a 3600
```

## Funcionamiento

Ejecutar el `delay` ocupa un instante. A continuación el proceso no avanza durante los
instantes indicados y vuelve a estar listo en el siguiente: después de `delay(3)` en el
instante 5, el proceso pasa demorado los instantes 6, 7 y 8 y puede seguir en el 9. En el
editor, la etiqueta del proceso indica cuántos instantes le faltan. `delay(0)` equivale a
`skip`.

Mientras tanto los demás procesos siguen avanzando. Si ninguno puede hacerlo pero alguno
está en `delay`, los instantes pasan igual, sin que avance nadie, y no se informa un
interbloqueo.

Dentro de un procedure, el proceso conserva el monitor durante la demora y los demás
esperan en la cola de entrada.

La demora se mide en instantes, la unidad de tiempo del simulador
([Instantes y turnos](/ejecucion/instantes-y-turnos)), y no en segundos: su duración en
pantalla depende de la velocidad elegida, como la del resto del programa.

## Errores

| Situación | Mensaje |
|---|---|
| Tiempo no entero | `El tiempo del delay tiene que ser int y es double` |
| En la inicialización del monitor | `El código de inicialización del monitor M no puede llamar a monitores ni usar wait, signal o delay` |
| Fuera de rango (ejecución) | `El delay tiene que ser de 0 a 3600 instantes y es de 4000` |

## Ejemplo

```monitores
process Partido {
  Cancha.Iniciar();
  delay(90);          // se juega el partido
  Cancha.Terminar();
}
```
