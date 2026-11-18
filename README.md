# Simulador de Monitores (UNLP)

Herramienta didáctica para la Práctica Profesional Supervisada (PPS) de la Facultad de
Informática (UNLP). Quien lo usa escribe pseudocódigo con la notación de la materia
Programación Concurrente, en cuyo material se basa, y lo ve ejecutarse paso a paso, bajo
la disciplina *signal and continue*. El alcance es solo monitores.

Todo corre en el navegador.
- El núcleo en Java se compila a JavaScript con TeaVM.
- La interfaz está hecha en React. No hay servidor.

La documentación es una guía de referencia y operación que se
publica junto con el simulador en `/docs/`: lenguaje, modelo de ejecución, interfaz,
procedimientos paso a paso y solución de problemas. Las fuentes son los Markdown de
`docs/`; el sitio se genera con VitePress (`cd frontend && npm run docs:dev`). El material de
la cátedra (`docs/clases-materia/`), que es la fuente de verdad de la notación y de la
semántica, la especificación y las decisiones de diseño quedan en el repositorio y no se
publican.

## Qué permite hacer

- Escribir el programa en un editor con resaltado de sintaxis, sangría automática y
  comentado de líneas con Cmd/Ctrl + /. El programa se guarda solo en el navegador; se puede
  guardar en «Mis programas», abrir y descargar como archivo `.mon` y compartir con un enlace.
- Ejecutarlo de corrido o de a un instante (Ejecutar, Pausar, Paso, Detener), con cuatro
  velocidades y atajos de teclado (F5, F10, Shift + F5). Repetir una ejecución con la misma
  semilla y avanzar un instante con un proceso elegido.
- Seguir cada proceso en el código: un chip en el margen y una etiqueta junto a la línea
  dicen quién está ahí y qué hace (ejecuta, compite por un monitor, duerme en un `wait`,
  está en `delay` o no tuvo turno).
- Elegir la política de turnos: al azar, donde en cada instante avanza un subconjunto de los
  procesos listos, o en ronda. Se puede cambiar durante la ejecución.
- Ver cada monitor con el dibujo de sus tres zonas, sus colas y sus variables, con el
  proceso que escribió cada una y en qué instante; ver cada proceso con sus variables
  locales, y lo que escriben con `write(...)`.
- Recorrer la ejecución en una línea de tiempo, con una fila por proceso y un carril por
  monitor.
- Entender un deadlock: un cartel dice qué espera cada proceso y por qué
  nadie puede despertarlo.
- Leer los errores de compilación y de ejecución en español, con la línea donde ocurrieron
  (marcada en rojo). El compilador también controla los tipos y el alcance de los nombres.
- Abrir programas de ejemplo, uno por tema (exclusión mutua implícita, variables condición,
  código de inicialización, colas, vector de `cond`, vector de monitores, *deadlock*, entre
  otros), también desde la guía.

El lenguaje admite monitores con variables permanentes y `cond` (también arreglos de
`cond`), arreglos de monitores (`monitor Escritorio[id: 0..2]`), `wait`, `signal` y
`signal_all`, `delay`, procesos y familias de procesos (`process P[i: 0..N-1]`), parámetros
`in` y `out`, `if`, `while`, `for`, el intercambio `x :=: y`, los tipos `int`, `double`,
`bool` y `text`, arreglos, `Cola` y `ColaOrdenada` declaradas con los tipos de sus
componentes (`Cola c(int, text)`) y, la ordenada, con su orden
(`ColaOrdenada fila(int, int) desc`). Las cantidades fijas de los enunciados, como `N`, se
declaran como constantes del programa (`#define N 5`); no hay variables globales. Las
palabras reservadas no distinguen mayúsculas (`OR`, `OUT`, `colaOrdenada`); los nombres del
programa sí.

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

- [Presentación](docs/introduccion/presentacion.md): qué es el simulador y cómo se organiza la guía.
- [Lenguaje](docs/lenguaje/index.md): qué se puede escribir, con una página por instrucción y ejemplos.
- [Solución de problemas](docs/problemas/errores-de-compilacion.md): mensajes de error y qué hacer con cada uno.
- [Especificación](docs/lenguaje/especificacion.md): gramática (EBNF) y semántica.
- [Material de la cátedra](docs/clases-materia/): la Teoría 4 y la Explicación 3 de monitores, fuente de verdad de la notación y de la semántica.
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
npm run check                    # lint, tests, tipos, build y prueba del motor compilado
```

Las capturas de la guía (`docs/public/capturas`) se regeneran con
`node scripts/capturas.mjs`, con el simulador levantado.

En un clon nuevo, `sh scripts/instalar-hooks.sh` activa los hooks de git que verifican el
formato de los commits, el CHANGELOG y el motor regenerado. Las reglas están en
[CONTRIBUTING.md](./CONTRIBUTING.md).
