# Primer programa

Este recorrido ejecuta el ejemplo Productor/Consumidor, que el editor muestra al abrir el
simulador. Un productor deposita cinco números en un buffer de un lugar y un consumidor los
retira; el monitor `Buffer` hace que ninguno avance cuando no corresponde.

```c
monitor Buffer {
  int dato = 0;
  bool hayDato = false;
  cond libre, ocupado;

  procedure depositar(d: in int) {
    while (hayDato) wait(libre);
    dato = d;
    hayDato = true;
    signal(ocupado);
  }

  procedure retirar(r: out int) {
    while (not hayDato) wait(ocupado);
    r = dato;
    hayDato = false;
    signal(libre);
  }
}

process Productor {
  int i = 1;
  while (i <= 5) {
    Buffer.depositar(i);
    write("deposite ", i);
    i++;
  }
}

process Consumidor {
  int x = 0;
  int n = 0;
  while (n < 5) {
    Buffer.retirar(x);
    write("retire ", x);
    n++;
  }
}
```

## Procedimiento

1. Abrir el simulador. Si el editor tiene otro programa, elegir **Productor/Consumidor** en
   el menú **Ejemplos** de la barra.
2. Elegir la velocidad **Lento** para seguir cada instante con calma.
3. Presionar **Paso** una vez. El programa se compila; si tiene errores, el mensaje aparece
   debajo del editor y la simulación no arranca. Si compila, avanza el primer instante.
4. Observar el editor: sobre la línea en la que está cada proceso aparece una franja con su
   nombre. El color y el rayado de la franja indican el [estado](/ejecucion/estados).
5. Observar el panel **Monitores**, a la derecha: el dibujo de `Buffer` muestra qué proceso
   está adentro, cuál compite por entrar y cuál espera en `libre` u `ocupado`.

   <figure>

   ![Simulador con Productor/Consumidor en pausa en el instante 7: en el editor, la franja del Consumidor en la línea 16 y la del Productor en la línea 26; en el panel de monitores, el Consumidor dentro de Buffer, con dato en 1 y hayDato en true](/capturas/primer-programa.png)

   <figcaption>Instante 7: el Consumidor está dentro de <code>Buffer</code> retirando el primer dato y el Productor ya salió del monitor y ejecuta el <code>write</code>.</figcaption>
   </figure>

6. Presionar **Ejecutar**. La simulación avanza sola hasta terminar o hasta que se presione
   **Pausar**.
7. Al terminar, la barra indica **fin**. Abrir **Salida** para leer las líneas que
   escribieron los procesos con `write`.

## Resultado esperado

La salida tiene cinco líneas `deposite` y cinco líneas `retire`. Las del consumidor
muestran los números del 1 al 5 en orden, sin repetir ni saltear ninguno: el monitor impide
que el productor deposite sobre un dato no retirado y que el consumidor retire de un buffer
vacío. El intercalado de las líneas de uno y otro proceso cambia entre corridas, porque
`write` se ejecuta fuera del monitor y los turnos se asignan al azar.

<figure>

![Panel de salida con diez líneas alternadas: deposite 1, retire 1, deposite 2, retire 2, y así hasta retire 5, cada una con su instante y el nombre del proceso en su color](/capturas/salida.png)

<figcaption>Una salida posible. El número de la izquierda es el instante en que se ejecutó cada <code>write</code>.</figcaption>
</figure>

Presionar **Paso** o **Ejecutar** después del fin vuelve a compilar el programa y lo ejecuta
desde el principio.

## Siguientes pasos

| Para | Ver |
|---|---|
| Entender por qué la espera se escribe con `while` | [Variables condición](/ejecucion/variables-condicion) |
| Seguir un programa instante a instante | [Ejecución paso a paso](/operacion/paso-a-paso) |
| Escribir un ejercicio de la práctica | [Notación de la cátedra](/introduccion/notacion-de-la-catedra) |
| Conocer cada zona de la pantalla | [Interfaz](/interfaz/) |
