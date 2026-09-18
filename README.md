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
| [`backend/`](./backend) | **Núcleo** (lexer + parser + validador + máquina virtual de monitores), el puente a JavaScript y una API REST que expone el mismo núcleo | Java 21, Spring Boot 3, TeaVM, Maven |
| [`frontend/`](./frontend) | Interfaz web: editor, panel de monitores, línea de tiempo, historial | React 19, TypeScript, Vite |
| [`docs/`](./docs) | Teoría, gramática, SRS, propuesta de PPS | — |
| [`legacy/`](./legacy) | Prototipo previo (semáforos), archivado | — |

El núcleo (`backend/src/main/java/.../lang` + `.../vm`) no depende de Spring: sólo usa
`java.util`. Eso permite compilarlo **entero a JavaScript con [TeaVM](https://teavm.org)** y
correrlo dentro del navegador, sin servidor:

```
lang/ + vm/  ──(javac)──>  bytecode  ──(TeaVM)──>  frontend/src/engine/simulador.js
    ▲                                                          │
    └── js/SimuladorJs.java  (puente @JSExport)                └── lo importa src/api.ts
```

`frontend/src/engine/simulador.js` es **código generado y commiteado**: no se edita a mano.
Se regenera con `npm run engine` desde `frontend/` (o `mvn -Pweb package` desde `backend/`),
y hay que hacerlo cada vez que se toca el núcleo Java. Se commitea porque el hosting sirve
archivos estáticos y no tiene JDK ni Maven para generarlo en el deploy.

`api/` expone el mismo núcleo por REST (Spring Boot, estado en memoria). Queda como segunda
puerta de entrada al núcleo y para pruebas de integración, pero el frontend no la usa: llama
al motor compilado de forma directa y sincrónica. El *time-travel* lo arma el frontend
acumulando los snapshots que devuelve cada paso.

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

### La API REST (opcional)

No hace falta para usar el simulador, pero expone el mismo núcleo:

```bash
cd backend
mvn spring-boot:run     # http://localhost:8080
```

### Tests del núcleo

```bash
cd backend && mvn test
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
  `int` / `double` / `boolean` / `text` y `Cola` FIFO (`push` / `pop` / `empty`).
- Parámetros `in` / `out`.

## Deploy

Sitio estático: `vercel.json` compila `frontend/` y publica `frontend/dist`. No hay servicio
que desplegar ni variables de entorno que configurar, porque el simulador corre entero en el
navegador de quien abre la página.

Lo único a recordar: si tocaste el núcleo Java, regenerá el motor (`npm run engine`) y
commiteá `frontend/src/engine/simulador.js` antes de pushear — el deploy no puede generarlo.

## API REST

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/simulations` | Compila el código y crea una simulación. `400` con `{error, line}` si falla. |
| `POST` | `/api/simulations/{id}/step` | Avanza un instante. Body: `{chosenProcessId?, policy}` (`RANDOM` \| `ROUND_ROBIN`). |
| `POST` | `/api/simulations/{id}/reset` | Reinicia al instante 0. |
| `GET` | `/api/simulations/{id}` | Estado completo (para reconexión). |
| `DELETE` | `/api/simulations/{id}` | Libera la simulación. |
