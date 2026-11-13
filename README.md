# Simulador de Monitores (UNLP)

Herramienta didáctica para la Práctica Profesional Supervisada (PPS) de la Facultad de
Informática (UNLP). El alumno escribe pseudocódigo con la notación de la cátedra y lo ve
ejecutarse paso a paso, bajo la disciplina *signal and continue*. El alcance es solo
monitores.

Todo corre en el navegador.
- El núcleo en Java se compila a JavaScript con TeaVM.
- La interfaz está hecha en React. No hay servidor.

## Qué permite hacer

- Escribir el programa en un editor con resaltado de sintaxis, sangría automática y
  comentado de líneas con Cmd/Ctrl + /.
- Ejecutarlo de corrido o de a un instante (Ejecutar, Pausar, Paso, Detener), con cuatro
  velocidades.
- Seguir cada proceso en el código: una franja de color marca la línea en la que está y
  cambia de aspecto si el proceso avanzó en el último instante, está listo o está bloqueado
  (en la entrada de un monitor o en una variable condición).
- Elegir la política de turnos: al azar, donde en cada instante avanza un subconjunto de los
  procesos listos, o en ronda. Se puede cambiar durante la ejecución.
- Ver en una pantalla de salida lo que escriben los procesos con `write(...)`.
- Detectar el interbloqueo (*deadlock*) cuando ningún proceso puede avanzar.
- Leer los errores de compilación y de ejecución en español, con la línea donde ocurrieron
  (marcada en rojo). El compilador también controla los tipos y el alcance de los nombres.
- Cargar programas de ejemplo desde el menú Ejemplos (buffer, exclusión mutua,
  `signal_all`, colas, interbloqueo, entre otros).

El lenguaje admite monitores con variables permanentes y `cond` (también arreglos de
`cond`), arreglos de monitores (`monitor Escritorio[id: 0..2]`), `wait`, `signal` y
`signal_all`, procesos y familias de procesos (`process P[i: 0..N]`), parámetros `in` y `out`, `if`, `while`, `for`, los tipos `int`,
`double`, `bool` y `text`, arreglos, `Cola` y `ColaOrdenada`. No hay variables globales.

```c
monitor Buffer {
  int dato = 0;
  bool hayDato = false;
  cond libre, ocupado;

  procedure depositar(d: in int) {
    while (hayDato) wait(libre);
    dato = d; hayDato = true;
    signal(ocupado);
  }
  procedure retirar(r: out int) {
    while (not hayDato) wait(ocupado);
    r = dato; hayDato = false;
    signal(libre);
  }
}

process Productor { for (int i = 1..5) { Buffer.depositar(i); } }
process Consumidor { int x; for (1..5) { Buffer.retirar(x); write("recibí ", x); } }
```

## Documentación

- [Referencia del lenguaje](docs/referencia_lenguaje.md): qué se puede escribir, con ejemplos.
- [Especificación](docs/sintaxis_especificacion.md): gramática (EBNF) y semántica.
- [Monitores](docs/monitores.md): la teoría de la cátedra y cómo la implementa el simulador.
- [Decisiones de diseño](docs/decisiones/): ADR del proyecto.

## Cómo correrlo

Requisitos: Node 20 o posterior. Para modificar el núcleo Java, además JDK 21 y Maven 3.9.
Si `java -version` muestra otra versión, Maven falla al compilar: hay que apuntar
`JAVA_HOME` al JDK 21 antes de los comandos de Maven o de `npm run engine`, por ejemplo
`export JAVA_HOME=$(/usr/libexec/java_home -v 21)` en macOS.

```bash
./dev.sh
```

El script instala las dependencias la primera vez, genera el motor si falta y levanta la
aplicación en <http://localhost:5173>.

Si se modifica el núcleo (`nucleo/`), hay que regenerar el motor y commitearlo junto con el
código Java:

```bash
cd nucleo && mvn test            # tests del núcleo
cd ../frontend && npm run engine # regenera src/engine/simulador.js
npm run check                    # lint, tipos, build y prueba del motor compilado
```

En un clon nuevo, `sh scripts/instalar-hooks.sh` activa los hooks de git que verifican el
formato de los commits, el CHANGELOG y el motor regenerado. Las reglas están en
[CONTRIBUTING.md](./CONTRIBUTING.md).
