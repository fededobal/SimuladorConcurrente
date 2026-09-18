# Simulador de Monitores (UNLP)

Herramienta de simulación **de monitores** para la materia *Programación Concurrente* de la
Facultad de Informática (UNLP). Permite escribir pseudocódigo con monitores y variables
condición y ejecutarlo paso a paso o de corrido bajo la disciplina **signal and continue**.
El editor marca la línea en la que está cada proceso y una pantalla muestra lo que escribe
`write(...)`. El alcance es solo monitores ([ADR 0003](./docs/decisiones/0003-alcance-solo-monitores.md));
lo próximo es visualizar el estado del monitor: variables, colas de las variables condición,
estructuras de datos y un historial en forma de línea de tiempo.

Proyecto de Práctica Profesional Supervisada (Analista en TIC). Reemplaza al prototipo
anterior basado en semáforos, que queda archivado en el tag de git `prototipo-semaforos`
(`git checkout prototipo-semaforos -- legacy/` lo recupera).

## Arquitectura

Monorepo sin servidor: todo corre en el navegador.

| Carpeta | Qué es | Stack |
|---|---|---|
| [`nucleo/`](./nucleo) | **Núcleo** (lexer + parser + validador + máquina virtual de monitores) y el puente a JavaScript | Java 21, TeaVM, Maven |
| [`frontend/`](./frontend) | Interfaz web: editor con la línea de cada proceso, pantalla de salida, ejemplos, semilla, política y enlaces para compartir | React 19, TypeScript, Vite |
| [`ejemplos/`](./ejemplos) | Programas de ejemplo (`.mon`): los ofrece la interfaz y los prueban JUnit y el smoke | — |
| [`docs/`](./docs) | Teoría de monitores, referencia y especificación del lenguaje, decisiones de diseño (ADR) | — |
| [`scripts/`](./scripts) | Smoke del motor compilado, huella del núcleo, hooks, revisión de estilo | Node |

El núcleo (`nucleo/src/main/java/.../lang` + `.../vm`) sólo usa `java.util`. Eso permite
compilarlo **entero a JavaScript con [TeaVM](https://teavm.org)** y correrlo dentro del
navegador, sin servidor:

```
lang/ + vm/  ──(javac)──>  bytecode  ──(TeaVM)──>  frontend/src/engine/simulador.js
    ▲                                                          │
    └── js/SimuladorJs.java  (puente @JSExport)                └── lo importa src/api.ts
```

`frontend/src/engine/simulador.js` es **código generado y commiteado**: no se edita a mano.
Se regenera con `npm run engine` desde `frontend/` (o `mvn -Pweb package` desde `nucleo/`),
y hay que hacerlo cada vez que se toca el núcleo Java. Se commitea porque el hosting sirve
archivos estáticos y no tiene JDK ni Maven para generarlo en el deploy.

## Cómo correrlo

Requisitos: **Node 20+** para correr la app. Para regenerar el motor, además **JDK 21+** y
**Maven 3.9+**.

```bash
./dev.sh
```

Abre <http://localhost:5173>. Corre `npm install` la primera vez y genera el motor si falta.

La primera vez en un clon nuevo, activá los hooks de git (formato de commit, CHANGELOG y motor
regenerado): `sh scripts/instalar-hooks.sh`. Las reglas están en [`CONTRIBUTING.md`](./CONTRIBUTING.md).

### En la interfaz

- **Ejemplos**: carga los programas de [`ejemplos/`](./ejemplos).
- **Política**: turnos al azar (en cada instante avanza un subconjunto de los procesos listos)
  o turnos en ronda (avanzan todos, por turno).
- **Semilla**: cada corrida usa una semilla nueva, que se muestra en la barra. Al hacer clic
  en ella (o al escribir una) queda fija y todas las corridas repiten el mismo entrelazado.
- **Compartir**: copia un enlace con el programa, la semilla y la política. El programa va
  comprimido en el fragmento de la URL (`#p=...`), que no llega a ningún servidor.

### Al tocar el núcleo Java

```bash
cd frontend
npm run engine     # recompila lang/ + vm/ + js/ a src/engine/simulador.js y actualiza simulador.hash
npm run smoke      # prueba el motor compilado con los casos canónicos y los ejemplos
npm run check      # huella + lint + tipos + build + smoke
```

El hook `pre-commit` y el CI rechazan un cambio en el núcleo sin el motor regenerado.

### Tests del núcleo

```bash
cd nucleo && mvn test
```

Incluye los programas canónicos de la teoría (exclusión mutua, buffer de un dato con
`cond`, `signal_all`, parámetros `out`, colas, deadlock), cada ejemplo de `ejemplos/` con 25
semillas y con turnos en ronda, las regresiones de los bugs de la revisión y el contrato del
puente con el navegador.

## El lenguaje

Pseudocódigo tipado estilo C. Ver la especificación completa y la gramática EBNF en
[`docs/sintaxis_especificacion.md`](./docs/sintaxis_especificacion.md) y la teoría en
[`docs/monitores.md`](./docs/monitores.md).

```c
monitor Buffer {
  int dato = 0;
  boolean hayDato = false;
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

process Productor { int i = 1; while (i <= 5) { Buffer.depositar(i); i++; } }
process Consumidor { int x = 0; Buffer.retirar(x); }
```

- Solo monitores. Exclusión mutua **implícita**; sincronización por condición **explícita**
  con `wait` / `signal` / `signal_all` (disciplina *signal and continue*).
- **No hay variables globales**: toda variable vive dentro de un monitor (permanente) o de
  un proceso (local).
- `process`, familias `process P[i: 0..5]`, `if` / `while` / `for` (estilo C y de rango:
  `for (int i = 1..n)`, `for (1..n)`), tipos
  `int` / `double` / `boolean` / `text`, `Cola` FIFO y `ColaOrdenada` de prioridad
  (`push` / `pop` / `empty`), y `write(...)` para imprimir en la pantalla de salida.
- Parámetros `in` / `out`.

## Deploy

Sitio estático: `vercel.json` compila `frontend/` y publica `frontend/dist`. No hay servicio
que desplegar ni variables de entorno que configurar, porque el simulador corre entero en el
navegador de quien abre la página.

Lo único a recordar: si tocaste el núcleo Java, regenerá el motor (`npm run engine`) y
commiteá `simulador.js` y `simulador.hash` junto con el Java, porque el deploy no puede
generarlos. El hook y el CI lo verifican.

Los cambios de cada versión, con autor y fecha, están en [`CHANGELOG.md`](./CHANGELOG.md).
