# Primer programa

Este recorrido ejecuta el ejemplo Exclusión mutua implícita, que el editor muestra al abrir
el simulador. `N` personas usan un cajero automático, sin ningún orden; el monitor `Cajero`
representa al cajero y hace que lo use una sola persona a la vez. La primera línea declara
la [constante](/lenguaje/constantes) `N`, que vale 5.

```monitores
#define N 5

monitor Cajero {
  int usos = 0;

  procedure PasarAlCajero() {
    delay(2);              // UsarCajero()
    usos = usos + 1;
  }
}

process Persona[id: 0..N-1] {
  Cajero.PasarAlCajero();
  write("Persona ", id, ": usé el cajero");
}
```

El programa se puede ejecutar en esta misma página, con los botones que están debajo del
código ([Ejemplos de código](/introduccion/presentacion#ejemplos-de-codigo)). El
procedimiento que sigue usa el simulador, que además muestra el dibujo del monitor y la
línea de tiempo.

## Procedimiento

1. Abrir el simulador. Si el editor tiene otro programa, abrir el menú del programa, en la
   barra, y elegir **Exclusión mutua implícita** en la lista **Ejemplos**.
2. Elegir la velocidad **Lento** para seguir cada instante con calma.
3. Presionar **Paso** una vez. El programa se compila; si tiene errores, el mensaje aparece
   debajo del editor y la simulación no arranca. Si compila, avanza el primer instante.
4. Observar el editor: la línea en la que está cada proceso lleva un chip con su inicial en
   el margen y, al final del código, una etiqueta con su nombre y lo que está haciendo. El
   color y el ícono de la etiqueta indican el [estado](/ejecucion/estados).
5. Observar la pestaña **Monitores**, a la derecha: el dibujo de `Cajero` muestra qué proceso
   está adentro y cuáles compiten por entrar.

   <figure>

   ![Simulador con Exclusión mutua implícita en pausa en el instante 7: el editor marca a Persona[3] en el delay y a otras tres personas que compiten por Cajero, la pestaña Monitores muestra el monitor Cajero ocupado por Persona[3] con tres procesos en la zona Compitiendo, y la línea de tiempo tiene siete columnas](/capturas/primer-programa.png)

   <figcaption>Instante 7 de una ejecución. <code>Persona[2]</code> ya usó el cajero y ahora lo ocupa <code>Persona[3]</code>, que está en el <code>delay</code>; las otras tres compiten por entrar.</figcaption>
   </figure>

6. Presionar **Ejecutar**. La simulación avanza sola hasta terminar o hasta que se presione
   **Pausar**.
7. Al terminar, la barra indica **Terminó**. Abrir la pestaña **Salida** para leer las
   líneas que escribieron los procesos con `write`.

## Resultado esperado

La salida tiene cinco líneas, una por persona, y la variable `usos` del monitor termina en 5.
En la línea de tiempo, el carril de `Cajero` muestra un solo nombre por instante: mientras
una persona está en el `delay`, las demás compiten por entrar. El orden en que pasan cambia
entre ejecuciones y no coincide con el orden en que llamaron, porque cuando el monitor queda
libre entra cualquiera de los procesos que compiten.

<figure>

![Pestaña Salida con cinco líneas: Persona 2, Persona 3, Persona 1, Persona 0 y Persona 4 usaron el cajero, cada una con su instante y el nombre del proceso en su color](/capturas/salida.png)

<figcaption>Una salida posible. El número de la izquierda es el instante en que se ejecutó cada <code>write</code>.</figcaption>
</figure>

Presionar **Paso** o **Ejecutar** después del fin vuelve a compilar el programa y lo ejecuta
desde el principio con otra semilla. El botón **Repetir** lo ejecuta de nuevo con la misma,
para volver a ver la ejecución que acaba de terminar.

## Siguientes pasos

| Para | Ver |
|---|---|
| Ver cómo espera un proceso dentro de un monitor | [Variables condición](/ejecucion/variables-condicion) |
| Recorrer los demás ejemplos, uno por tema | [Programas de ejemplo](/referencia/ejemplos) |
| Seguir un programa instante a instante | [Ejecución paso a paso](/operacion/paso-a-paso) |
| Pasar al simulador un programa escrito con la notación de la materia | [Notación de la cátedra](/introduccion/notacion-de-la-catedra) |
| Conocer cada zona de la pantalla | [Interfaz](/interfaz/) |
