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
| [`backend/`](./backend) | **Núcleo** (lexer + parser + validador + máquina virtual de monitores) y una API REST que lo expone | Java 21, Spring Boot 3, Maven |
| [`frontend/`](./frontend) | Interfaz web: editor, panel de monitores, línea de tiempo, historial | React 19, TypeScript, Vite |
| [`docs/`](./docs) | Teoría, gramática, SRS, propuesta de PPS | — |
| [`legacy/`](./legacy) | Prototipo previo (semáforos), archivado | — |

El núcleo (`backend/src/main/java/.../lang` + `.../vm`) no depende de Spring y podría
reutilizarse en otro contexto. La comunicación es REST con estado en memoria en el servidor;
el frontend maneja la "ejecución completa" (bucle de pasos) y el *time-travel* acumulando los
snapshots que devuelve cada paso.

## Cómo correrlo

Requisitos: **JDK 21+**, **Maven 3.9+**, **Node 20+**.

### Todo junto

```bash
./dev.sh
```

Levanta backend (`:8080`) y frontend (`:5173`) en un solo comando; `Ctrl-C` corta los dos.
Libera los puertos antes de arrancar y corre `npm install` la primera vez. Fija `JAVA_HOME`
al JDK 21 de Homebrew (exportá tu propio `JAVA_HOME` para usar otro).

### Por separado

```bash
# 1) Backend  (http://localhost:8080)
cd backend
mvn spring-boot:run

# 2) Frontend (http://localhost:5173)  — en otra terminal
cd frontend
npm install
npm run dev
```

En desarrollo el frontend hace peticiones a `/api/...` y Vite las redirige al backend
(sin CORS). Abrir <http://localhost:5173>.

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
- Todo el estado compartido vive dentro de un monitor. Fuera solo se permiten constantes
  globales (`int N = 5;`).
- `process`, familias `process P[i: 0..N]`, `if` / `while` / `for`, tipos
  `int` / `double` / `boolean` / `text` y `Cola` FIFO (`push` / `pop` / `empty`).
- Parámetros `in` / `out` / `inout`.

## Deploy

El frontend es estatico y va a Vercel (`vercel.json`), pero el nucleo es Java: Vercel no lo
ejecuta, asi que el backend se despliega aparte y el frontend lo apunta por URL. Si falta ese
paso, la app compila pero cada pedido a `/api/...` cae en el 404 de Vercel.

1. **Backend** en Render (o Railway / Fly, cualquiera que corra Docker): hay un
   `backend/Dockerfile` y un `render.yaml` listos. En Render, *New > Blueprint* sobre el repo
   toma el `render.yaml`; a mano, *New > Web Service* con runtime Docker, dockerfile path
   `./backend/Dockerfile` y context `./backend`. El puerto sale de `PORT`, que el host inyecta.
2. **CORS**: en el backend, variable de entorno `CORS_ORIGINS` con el dominio de Vercel.
   Admite comodines, por ejemplo `https://mi-simulador.vercel.app,https://*.vercel.app`
   (el segundo habilita tambien los preview deploys).
3. **Frontend**: en Vercel, *Settings > Environment Variables*, `VITE_API_URL` con el origen
   del backend sin barra final (ver `frontend/.env.example`) y **redeploy** — es una variable
   de build, un deploy viejo no la toma.

En el plan gratuito de Render el servicio se duerme tras unos minutos sin trafico: la primera
ejecucion despues de la siesta tarda algunas decenas de segundos en responder.

## API REST

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/simulations` | Compila el código y crea una simulación. `400` con `{error, line}` si falla. |
| `POST` | `/api/simulations/{id}/step` | Avanza un instante. Body: `{chosenProcessId?, policy}` (`RANDOM` \| `ROUND_ROBIN`). |
| `POST` | `/api/simulations/{id}/reset` | Reinicia al instante 0. |
| `GET` | `/api/simulations/{id}` | Estado completo (para reconexión). |
| `DELETE` | `/api/simulations/{id}` | Libera la simulación. |
