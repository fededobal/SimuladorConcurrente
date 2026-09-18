# Simulador de Monitores (UNLP)

Herramienta de simulación **de monitores** para la materia *Programación Concurrente* de la
Facultad de Informática (UNLP). Permite escribir pseudocódigo con monitores y variables
condición, ejecutarlo paso a paso o completo, y observar de forma visual la exclusión mutua
implícita, las colas de las variables condición y la competencia por entrar al monitor bajo
la disciplina **signal and continue**.

Proyecto de Práctica Profesional Supervisada (Analista en TIC). Reemplaza al prototipo
anterior basado en semáforos, que queda archivado en [`legacy/`](./legacy) solo como
referencia visual.

## Arquitectura

Monorepo con dos partes independientes:

| Carpeta | Qué es | Stack |
|---|---|---|
| [`nucleo/`](./nucleo) | **Núcleo** (lexer + parser + validador + máquina virtual de monitores) y el puente a JavaScript | Java 21, TeaVM, Maven |
| [`frontend/`](./frontend) | Interfaz web: editor, panel de monitores, línea de tiempo, historial | React 19, TypeScript, Vite |
| [`docs/`](./docs) | Teoría, gramática, SRS, propuesta de PPS | — |
| [`legacy/`](./legacy) | Prototipo previo (semáforos), archivado | — |

El núcleo (`nucleo/src/main/java/.../lang` + `.../vm`) sólo usa `java.util`. Eso permite compilarlo **entero a JavaScript con [TeaVM](https://teavm.org)** y
correrlo dentro del navegador, sin servidor:

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

### Al tocar el núcleo Java

```bash
cd frontend
npm run engine     # recompila lang/ + vm/ a src/engine/simulador.js
```

### Tests del núcleo

```bash
cd nucleo && mvn test
```

Incluye los programas canónicos de la teoría (contador `TOTAL`, buffer de un dato con
`cond`, buffer limitado, broadcast con `signal_all`) y verificación de deadlock, exclusión
mutua y parámetros `out`.

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
commiteá `frontend/src/engine/simulador.js` antes de pushear — el deploy no puede generarlo.
