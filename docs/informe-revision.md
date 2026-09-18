# Informe de revisión — Simulador de Monitores (PPS)

Revisión completa del repositorio al 18/09/2026 (zip con el motor ya compilado con TeaVM y
sin backend en uso) más el historial de git exportado (`log.csv`, 18 commits hasta el
17/09). Todo lo marcado como **verificado** se reprodujo ejecutando el motor compilado
real (`frontend/src/engine/simulador.js`) en Node; los scripts quedan en el kit para que
cualquiera lo repita.

Contenido: 1. Resumen · 2. Lo que está bien · 3. Bugs verificados · 4. Riesgos y deuda ·
5. Arquitectura: opciones (incluye la extensión a otros conceptos de concurrencia) ·
6. Estructura propuesta · 7. Git, commits y CHANGELOG · 8. El kit para Claude ·
9. Plan de trabajo · 10. Preguntas abiertas.

---

## 1. Resumen

El proyecto está en mejor estado que la mayoría de las PPS en esta etapa: el núcleo está
bien diseñado, tiene tests con los programas canónicos de la cátedra y la decisión de sacar
el servidor fue correcta. Los problemas no están en el diseño sino en tres lugares:

1. **Seis bugs verificados** en el motor, dos de ellos visibles en clase: un error del
   programa del alumno se muestra como *deadlock* (B1), y la memoria crece sin tope hasta
   poder colgar la pestaña (B6).
2. **Nada protege al artefacto generado.** `simulador.js` se commitea a mano y nada
   verifica que corresponda al Java actual. Es la forma más probable de publicar un bug
   que "ya estaba arreglado".
3. **El historial de git no sirve como bitácora**: 12 de 18 commits sin mensaje real y el
   98 % de las líneas cambiadas en 6 commits.

El kit que acompaña este informe ataca los tres: tests de regresión, prueba de humo del
motor compilado, huella del núcleo + hooks + CI, reglas del repo, guía de commits y seis
skills para que Claude trabaje con el contexto del proyecto en lugar de adivinarlo.

---

## 2. Lo que está bien (y conviene no romper)

- **Separación núcleo / resto.** `lang/` y `vm/` usan solo `java.util`. Esa disciplina es
  lo que hizo posible pasar a TeaVM sin reescribir nada.
- **AST con `sealed interface` + records + `switch` exhaustivo.** Agregar una construcción
  al lenguaje hace que el compilador marque cada lugar que falta completar. Es la mejor
  checklist posible y la skill `extender-lenguaje` se apoya en eso.
- **Errores con número de línea** desde el lexer hasta la VM, en español.
- **Tests con los programas de la teoría** (contador, buffer con `cond`, `signal_all`,
  deadlock, `out`) y con 25 semillas cuando hay azar.
- **Reproducibilidad por semilla** en la VM: base para "mostrá el caso raro otra vez".
- **Validaciones semánticas útiles para el alumno**: aridad de colas fijada por el primer
  uso, `wait` fuera de procedure, `out` con argumento no asignable.
- **README y comentarios que explican el porqué**, no solo el qué.
- **Sacar el servidor.** Un simulador que no comparte estado entre usuarios no necesita
  backend; la latencia por paso contra un servicio gratuito era un costo sin beneficio.

---

## 3. Bugs verificados

Reproducidos con `node scripts/smoke-motor.mjs` sobre el motor compilado. Cada uno tiene
un test JUnit en `RegresionesVmTest` / `SimuladorJsTest` marcado `@Disabled`: al
arreglarlo, se saca el `@Disabled` y se mueve el caso de `CONOCIDOS` a `CANONICOS` en el
smoke.

| # | Gravedad | Qué pasa | Dónde |
|---|---|---|---|
| B1 | **Alta** | Un error de ejecución dentro de un procedure (p. ej. división por cero) deja el monitor tomado por un proceso terminado. Los demás quedan bloqueados y la UI dice **DEADLOCK**. El alumno busca un error de sincronización que no existe. | `VirtualMachine.step` → `catch (RuntimeError)` + `Process.fail` |
| B6 | **Alta** | Cada evento guarda un snapshot completo del estado y el log nunca se recorta. Con una familia de 50 procesos: **+667 MB de heap en 2000 pasos** (~4 min en "muy rápido"). Con 20 procesos, +131 MB. El frontend solo usa el último snapshot. | `VirtualMachine.event` / `log` |
| B2 | Media | `d++` sobre `double` trunca: `1.5` pasa a `2.0`. | `execIncDec`: `asLong() + 1` |
| B3 | Media | Overflow de `int` (`Math.addExact`) lanza `ArithmeticException`, que no es `RuntimeError`: cruza a JS y la UI muestra `Error: null`. | `ExprEvaluator.arith`, `SimuladorJs.paso` |
| B4 | Baja | Un literal fuera de rango (`99999999999999999999`) da un error en inglés sin línea. | `Parser.parsePrimary` → `Long.parseLong` |
| B5 | Baja | Un error en el código de inicialización del monitor escapa de `crear` como excepción, no como `{error, line}`. | `SimuladorJs.crear` solo atrapa `CompilationException` |

Arreglos sugeridos (a implementar con test primero):

- **B1**: en el `catch` de `step`, antes de `p.fail(...)`, recorrer la pila de
  activaciones del proceso y, por cada monitor del que sea `lockOwner`, soltarlo y llamar a
  `wakeEntryQueue`. Sacarlo también de cualquier cola de entrada o de `cond` en la que esté.
  Es la invariante 3 de la skill `vm-monitores`.
- **B6**: el snapshot completo no debería vivir en cada `LogEntry`. Opciones de menor a
  mayor cambio: (a) guardar snapshot solo en el último evento de cada instante;
  (b) tope al log (p. ej. últimos 2000 eventos) — el front hoy no lo lee; (c) si se quiere
  *time-travel*, guardar snapshots cada K instantes y re-simular desde la semilla. La (b)
  es un cambio de pocas líneas y resuelve el problema ya.
- **B2**: si el valor es `DoubleVal`, sumar `±1.0`; para arreglos, `coerceTo` del tipo del
  elemento en lugar de `new IntVal`.
- **B3 + B5**: convertir `ArithmeticException` en `RuntimeError("Desborde de entero", línea)`
  en `ExprEvaluator`; y en `SimuladorJs`, que **ninguna** función exportada lance (atrapar
  `RuntimeException` al final y devolver `Json.error`).
- **B4**: atrapar `NumberFormatException` en el parser y lanzar
  `CompilationException("Número fuera de rango", línea)`.

---

## 4. Riesgos y deuda técnica

**R1 · `simulador.js` sin control (alto).** Es código generado, commiteado a mano, sin
nada que verifique que corresponde al Java. Mitigación incluida en el kit:
`simulador.hash` (huella de `lang/ vm/ js/ pom.xml`), hook `pre-commit` que exige
regenerar y commitear juntos, CI que lo verifica y un smoke que prueba el JS real.

**R2 · Spring Boot muerto dentro del núcleo (medio).** `api/`, sus DTOs, `WebConfig`,
`SimulationControllerTest`, las dependencias de Spring en el mismo `pom.xml` y la tabla de
la API en el README describen algo que el producto no usa. Hay además dos serializaciones
de los mismos records (Jackson y `Json.java`) que pueden divergir sin que nadie lo note.
Ver opción E de la sección 5.

**R3 · Semántica de "instante" contradictoria en la documentación (medio).** La VM pasó a
turnos paralelos (`PROB_AVANCE = 80`). `referencia_lenguaje.md` y
`sintaxis_especificacion.md` línea 150 lo dicen, pero la **línea 171 del mismo documento**
sigue diciendo "un instante = una sentencia de un proceso". Además es una decisión
pedagógica (cambia qué entrelazados ve el alumno) que conviene validar con la cátedra y
dejar en un ADR.

**R4 · README desactualizado (medio).** Describe "panel de monitores, línea de tiempo,
historial" y *time-travel* que la UI actual no tiene, la API REST como si importara, y en la
tabla de carpetas menciona "SRS, propuesta de PPS" que ya no están en `docs/`.

**R5 · Documentos de la PPS borrados (a confirmar).** `docs/SRS_IEEE_830.md` y
`docs/propuesta_pps/propuesta.tex` estaban en el zip anterior y no en este. Si fue a
propósito, bien; si no, recuperarlos con `git log --diff-filter=D --name-only`.

**R6 · El motor corre en el hilo principal (bajo, por ahora).** Medido: 0,3 ms por paso con
4 procesos, 1 ms con 20, 4,6 ms con 50. No traba la UI hoy. Pasa a importar si se agrega
"ejecutar hasta el final" o programas grandes. Ver opción C.

**R7 · Capacidades del núcleo que la UI no expone (oportunidad).** La VM ya soporta
`ROUND_ROBIN`, elegir qué proceso avanza y semilla fija; la UI usa siempre `RANDOM` sin
mostrar la semilla. Mostrar la semilla y permitir "reproducir" es de lo más valioso
pedagógicamente y cuesta poco.

**R8 · Skills "caveman" (medio para el flujo de trabajo).** Ver sección 8.

**R9 · Nombres que ya no describen lo que hay (bajo).** `backend/` es el motor, no un
backend; `api.ts`/`ApiRequestError`/`ApiError` nombran una API que ya no existe.

**R10 · `legacy/` en `main` (bajo).** Un segundo proyecto Vite completo (con su
`package-lock` de ~3000 líneas) que solo sirve como referencia visual. Mejor en un tag
(`git tag prototipo-semaforos`) y fuera de `main`.

---

## 5. Arquitectura: opciones

Todas mantienen **Java para el núcleo y React + TypeScript para la interfaz**. Lo que cambia
es dónde corre cada cosa, cómo se construye y cómo se organiza el código.

### A. Situación actual
Núcleo Java → TeaVM → `simulador.js` commiteado; el front lo llama sincrónicamente en el
hilo principal; Spring queda en el mismo módulo sin uso.
Bien: simple, sin servidor, rápido. Mal: artefacto sin control (R1), código muerto (R2),
memoria (B6).

### B. Actual + higiene (lo mínimo recomendable)
Igual que A, más lo que trae el kit: huella + hook + CI + smoke; arreglar B1–B6; borrar
Spring o aislarlo (ver E).
Costo: horas. Es la base de todas las demás.

### C. Motor en un Web Worker
El mismo `simulador.js` se carga en un Worker; `api.ts` le manda mensajes y recibe
respuestas (`postMessage`). La interfaz nunca se traba y se habilita "ejecutar N pasos" o
"hasta el final" sin congelar la pestaña.
Costo: `api.ts` pasa a devolver `Promise` (curiosamente, `useSimulation` ya fue asíncrono
cuando existía la API REST; ese código sirve de modelo). Un archivo nuevo de ~40 líneas
para el Worker.
Cuándo: al agregar ejecución completa rápida o si se usan programas con muchos procesos.

### D. Motor generado en CI en lugar de commiteado
GitHub Actions compila el Java con Maven + TeaVM, construye el front y publica
(Vercel con despliegue precompilado, o GitHub Pages). El repo deja de tener código generado.
Bien: desaparece R1 de raíz, diffs limpios. Mal: para correr el front localmente hace falta
JDK + Maven (o descargar el artefacto del CI), y el deploy depende de Actions.
Término medio razonable: seguir commiteando (como ahora) y que el CI **verifique** (lo que
hace el kit). Pasar a D solo si el JS commiteado genera conflictos o molestias.

### E. Separar el núcleo en módulos Maven
```
nucleo/        lang + vm            (sin dependencias; tests JUnit)
puente-web/    js/ + perfil TeaVM   (depende de nucleo)
servidor/      api/ Spring          (depende de nucleo; opcional o se borra)
```
Hoy "el núcleo no depende de Spring" es una regla que se cumple por disciplina; con módulos
la hace cumplir el compilador. Los tests del núcleo corren sin levantar Spring (más
rápidos) y TeaVM solo ve lo que tiene que ver.
Costo: mover carpetas y escribir un `pom.xml` padre. Nada del código cambia.
Variante mínima: no crear módulos, solo **borrar `api/` y Spring** del `pom.xml` y renombrar
`backend/` a `nucleo/`. Si algún día se necesita un servidor, está en el historial de git.

### F. Navegador + servicios opcionales puntuales
El motor sigue en el navegador siempre. Un servidor solo aparece para funciones que lo
requieren de verdad. Antes de agregar uno, hay versiones sin servidor de casi todo:

| Función | Sin servidor | Con servidor |
|---|---|---|
| Compartir un programa | programa comprimido en la URL (`#p=...`) | links cortos guardados |
| Ejemplos de la cátedra | archivos `.mon` en el repo, cargados en la UI | banco editable por docentes |
| Guardar el trabajo | `localStorage` del navegador | cuentas de usuario |
| Entregas / corrección | — | necesita servidor + autenticación |

Recomendación: resolver compartir y ejemplos sin servidor. Si la cátedra pide entregas,
recién ahí el módulo `servidor/` de la opción E tiene sentido, reutilizando el mismo núcleo.

### G. TeaVM a WebAssembly
TeaVM tiene un backend a WebAssembly además del de JavaScript. Podría ser más rápido, pero
las mediciones muestran que el cuello de botella no es la CPU sino la memoria (B6) y la
serialización a JSON. Además cambia la interoperabilidad con JS. No se recomienda ahora;
si en el futuro hiciera falta, verificar el estado actual del soporte de TeaVM antes de
decidir.

### H. Preparar el núcleo para muchos conceptos de concurrencia
El proyecto no se queda en monitores: la idea es sumar semáforos, barreras, `await`,
pasaje de mensajes y lo que la cátedra necesite. Eso cambia la prioridad de la
arquitectura interna del núcleo más que la del despliegue. Hoy toda la lógica de monitores
vive dentro de `VirtualMachine` (~800 líneas) junto con el scheduler; si cada concepto se
agrega ahí, la clase se vuelve inmanejable y un cambio en semáforos puede romper monitores.

Propuesta (detallada en el ADR 0002 y en la skill `nuevo-concepto-concurrencia`):
- **Una VM común, primitivas por concepto.** Scheduler, procesos, instantes, deadlock,
  eventos y snapshots son comunes; cada concepto vive en `vm/<concepto>/` y usa una interfaz
  chica de la VM (bloquear, despertar, emitir evento, error con línea).
- **Modelos explícitos.** Cada programa se compila bajo un modelo (Monitores, Semáforos,
  …) elegido en la UI o por el ejercicio; el validador rechaza primitivas de otro modelo
  con un mensaje claro. La cátedra enseña los temas por separado.
- **Vista genérica de recursos.** El snapshot describe cualquier recurso con la misma forma
  (tipo, nombre, estado, dueño, colas), así el puente JSON y `types.ts` no cambian con cada
  concepto; la UI elige el panel por tipo.
- **AST en un solo paquete.** Detalle de Java: una `sealed interface` en código sin
  módulos solo admite subtipos del mismo paquete, así que los nodos se agrupan por orden y
  comentarios, no por subpaquetes.
- **Primer paso:** extraer monitores a `vm/monitores/` sin cambiar comportamiento, en un
  commit `refactor(vm)` aislado, con todos los canónicos en verde. Recién después, el
  segundo concepto.

### Comparación

| | Complejidad | Rendimiento | Riesgo de motor desactualizado | Dev local | Valor para la PPS |
|---|---|---|---|---|---|
| A actual | baja | bueno | alto | solo Node | — |
| **B higiene** | baja | bueno | bajo | solo Node | alto (calidad) |
| C Worker | media | UI nunca se traba | igual que base | solo Node | medio |
| D build en CI | media | igual | nulo | JDK + Maven | medio |
| **E módulos** | baja-media | igual | igual | igual | alto (diseño) |
| F servicios opc. | alta si hay server | igual | igual | depende | alto si la cátedra lo pide |
| G Wasm | alta | incierto | igual | igual | bajo |
| **H multi-concepto** | media (refactor inicial) | igual | igual | igual | muy alto (es el objetivo del proyecto) |

### Recomendación
1. **Ya**: B (el kit) + arreglar B1–B6.
2. **Próximo**: E en su variante mínima (borrar Spring, renombrar `backend/` → `nucleo/`),
   o completa si se quiere conservar el servidor como opción documentada.
3. **Antes del segundo concepto**: H (extraer monitores a su paquete, modelos explícitos).
4. **Cuando haga falta**: C (Worker) al agregar ejecución rápida; F sin servidor
   (URL compartible + ejemplos) como features de alto impacto y bajo costo.
5. D y G solo si aparece el problema que resuelven.

Cada paso, un ADR en `docs/decisiones/` (el 0001 ya documenta la salida del servidor).

---

## 6. Estructura propuesta

```
simulador-monitores/
├── .claude/
│   ├── settings.json            permisos de Claude Code para este repo
│   └── skills/                  commit, motor-java-js, extender-lenguaje,
│                                vm-monitores, revisar-codigo, documentar-pps
├── .githooks/                   commit-msg, pre-commit (versionados)
├── .github/workflows/ci.yml
├── nucleo/                      (hoy backend/) Java 21 puro
│   ├── pom.xml
│   └── src/{main,test}/java/ar/edu/unlp/info/simulador/
│       ├── lang/                lexer, parser, ast/, Modelo, validador
│       ├── vm/                  VM común + monitores/ semaforos/ mensajes/ … + vista/
│       └── js/                  puente
├── web/                         (hoy frontend/) React + TS + Vite
│   └── src/
│       ├── motor/               simulador.js (generado) + .hash + .d.ts + cliente.ts (hoy api.ts)
│       ├── simulacion/          useSimulation.ts, tipos
│       └── componentes/recursos/   un panel por concepto (PanelMonitor, PanelSemaforo…)
├── ejemplos/<concepto>/         programas canónicos .mon — UNA fuente para JUnit, smoke y la UI
├── docs/
│   ├── lenguaje/                referencia + especificación (EBNF)
│   ├── teoria/                  un documento por concepto (monitores, semáforos, …)
│   ├── decisiones/              ADRs
│   └── pps/                     propuesta, SRS, informe final
├── scripts/                     smoke-motor.mjs, motor-hash.mjs, instalar-hooks.sh
├── CHANGELOG.md                 qué cambió, quién y cuándo
├── CLAUDE.md  CONTRIBUTING.md  README.md
└── (legacy/ → tag git "prototipo-semaforos", fuera de main)
```

La pieza nueva con más valor es **`ejemplos/`**: hoy los programas canónicos están
repetidos en `VirtualMachineTest`, en el README, en el `DEFAULT_CODE` de `App.tsx` y ahora
en el smoke. Un único directorio de archivos `.mon` leído por los tests JUnit, por el smoke
y por la UI (Vite los importa con `?raw` para un menú "Cargar ejemplo") hace que un ejemplo
que se muestra en clase sea, por construcción, un ejemplo probado.

Los renombres (`backend→nucleo`, `frontend→web`) son opcionales: hacerlos en un commit solo
de movimiento (`refactor(repo): renombrar backend a nucleo`) para que git siga el historial.

---

## 7. Git, commits y CHANGELOG

### Diagnóstico (`log.csv`, 18 commits, mayo–septiembre 2026)

- 11 commits con mensaje `.` y 1 con `inicial`: **12 de 18 sin descripción**.
- 6 commits concentran el **98 %** de las líneas cambiadas (26 352 de 26 966). El mayor
  toca 98 archivos (`a62a512`).
- `1f0f2a8` dice `fix: hilo READY que bloqueará...` pero cambia 57 archivos y agrega
  ~3800 líneas: el mensaje esconde una reescritura.
- `3fae11d` junta dos tipos en un mensaje (`feat: ... fix: comentarios`).
- Dos identidades de autor (`fededobal` y `Federico Dobal`): se unifican con `.mailmap`.
- Lo bueno: 6 commits sí siguen Conventional Commits, así que el formato ya es conocido.

Consecuencias concretas: no se puede usar `git bisect` para encontrar cuándo entró un bug,
no se puede revertir una cosa sin arrastrar otras, y para la PPS se pierde la evidencia del
proceso (qué se probó, qué se descartó y por qué).

### Formato de commit
Siempre **prefijo, mensaje y, siempre que se pueda, descripción**:
```
fix(vm): liberar el monitor cuando un proceso falla adentro

Un error de ejecución dejaba el lock tomado y la interfaz mostraba
DEADLOCK aunque la sincronización del alumno era correcta.
```
El hook rechaza el commit sin prefijo o sin mensaje, y avisa si falta la descripción.

### CHANGELOG con autor
`CHANGELOG.md` (formato Keep a Changelog) registra cada cambio, quién lo hizo y cuándo:
`- Liberar el monitor cuando un proceso falla dentro de un procedimiento. (Federico Dobal, 2026-09-20)`.
Todo commit salvo `style` agrega su entrada en `[Sin publicar]`; el hook `commit-msg`
rechaza el commit si no hay una entrada nueva con el nombre de `git config user.name`. Se
incluye ya poblado con la versión 0.1.0 reconstruida desde el historial. Es la historia
legible del producto para la cátedra y para el informe; el `git log` sigue siendo la
historia técnica.

### Reglas
Están en `CONTRIBUTING.md` con ejemplos buenos y malos tomados de este historial. En corto:
Conventional Commits en español con alcances del proyecto; un commit = un cambio explicable
en una línea sin "y"; `git add -p` para partir; ramas cortas por tema; `main` siempre
publicable; el motor regenerado viaja con su Java.

### Lo que lo hace cumplir
- `.githooks/commit-msg`: rechaza `.`, mensajes sin prefijo, primeras líneas de más de 72
  y commits sin entrada propia en el CHANGELOG; avisa si falta la descripción.
- `.githooks/pre-commit`: rechaza núcleo tocado sin motor regenerado, y basura
  (`__MACOSX`, `.DS_Store`, `target/`, `dist/`, `node_modules/`).
- Skill `commit`: Claude arma los commits siguiendo lo mismo y explica el porqué.
- CI en cada push.

(Los hooks se probaron en un repo temporal: rechazan `.`, `arregle cosas`, `.DS_Store` y un
cambio en `vm/` sin motor; aceptan `docs(readme): aclarar cómo regenerar el motor`.)

---

## 8. El kit para Claude

### Qué había
Siete skills de terceros ("caveman") en **dos copias** (`agent/skills` y `.agents/skills`,
casi idénticas) más symlinks en `.claude/skills` (que en Windows o al comprimir quedan como
archivos de 30 bytes), y un `skills-lock.json`. Problemas para este proyecto:
- `caveman` se declara **activa en cada respuesta** y comprime el español a frases
  telegráficas. Para alguien que está aprendiendo y que tiene que escribir un informe de
  PPS, eso juega en contra: ahorra tokens a costa de explicaciones.
- `caveman-commit` se autoactiva al hacer staging y no conoce las reglas de este repo
  (motor regenerado, alcances, español).
- `caveman-stats` depende de un hook que no está instalado; `cavecrew` delega en subagentes
  que no existen en el repo.
Recomendación: sacarlas del repo (las tres carpetas y el lock). Si a Fede le sirve el modo
comprimido para ahorrar uso, que lo instale a nivel usuario (`~/.claude/skills`) y lo active
cuando quiera, no como regla del proyecto.

### Qué se propone

| Pieza | Para qué |
|---|---|
| `CLAUDE.md` (raíz, `backend/`, `frontend/`) | Claude arranca cada sesión sabiendo la arquitectura, los comandos, las reglas y qué no tocar. Es lo que más impacto tiene y no existía. |
| `.claude/settings.json` | Permite sin preguntar tests/lint/build/smoke; pregunta antes de `commit`/`push`; **prohíbe editar `simulador.js`**. |
| skill `convenciones-codigo` | Convenciones de Java y TypeScript (idioma, nombres, errores, determinismo, tamaño, tests) para que cualquier agente genere código consistente. |
| skill `commit` | Commits atómicos con prefijo, mensaje y descripción; entrada en el CHANGELOG con autor; chequeo del motor. |
| skill `motor-java-js` | Secuencia tests → regenerar → smoke; qué APIs usar con TeaVM; contrato del puente. |
| skill `extender-lenguaje` | Los 13 lugares que toca un cambio del lenguaje, en orden. |
| skill `nuevo-concepto-concurrencia` | Arquitectura y proceso para sumar semáforos, mensajes, barreras, etc. sin romper lo existente. |
| skill `semantica-concurrencia` | Modelo común, invariantes y una referencia por concepto (hoy monitores) con sus canónicos. |
| skill `revisar-codigo` | Revisión por gravedad con formato accionable. |
| skill `documentar-pps` | Entregables formales y verificados, sin rasgos de texto de IA; guía de estilo académico y estructura del informe final. |
| `CHANGELOG.md` | Registro de cambios con autor y fecha, verificado por el hook. |
| `scripts/revisar-estilo.mjs` | Marca muletillas, adjetivos inflados, rayas, viñetas y negritas en exceso en documentos formales. |
| `docs/decisiones/0002-...` | Propuesta de núcleo extensible por conceptos. |
| `CONTRIBUTING.md` | Reglas y mini-curso de git para humanos. |
| `scripts/smoke-motor.mjs` | Prueba el motor compilado real (canónicos + bugs conocidos). |
| `scripts/motor-hash.mjs` | Huella del núcleo para saber si el motor está al día. |
| `.githooks/`, `.github/workflows/ci.yml` | Hacen cumplir las reglas sin depender de la memoria. |
| Tests `RegresionesVmTest`, `SimuladorJsTest` | Un test por bug (desactivados hasta arreglarlos) + contrato del puente. |
| `docs/decisiones/0001-...` | ADR de la salida del servidor: material directo para el informe de PPS. |
| `.gitattributes`, `.editorconfig`, `.mailmap` | Finales de línea, formato, diffs sin el JS generado, autor unificado. |

La idea de fondo: las reglas importantes viven en tres lugares a la vez — escritas para
personas (`CONTRIBUTING.md`), para Claude (`CLAUDE.md` + skills) y en máquinas que las
verifican (hooks + CI). Si una falla, las otras dos la sostienen.

---

## 9. Plan de trabajo sugerido

Cada paso es un commit (o pocos) con el mensaje indicado.

0. `git config --global user.name "Federico Dobal"` (es el nombre que queda en el CHANGELOG).
1. `chore(repo): quitar skills caveman y duplicados` — borrar `agent/`, `.agents/`,
   `.claude/skills/*` actuales y `skills-lock.json`.
2. `chore(repo): agregar reglas, hooks y configuración de Claude` — copiar el kit
   (menos tests e informe); correr `sh scripts/instalar-hooks.sh`; completar `.mailmap`.
3. `build(motor): agregar huella del núcleo` — `npm run engine` (genera `simulador.hash`).
4. `test(vm): agregar regresiones de la revisión` — los dos archivos de test; `mvn test`
   tiene que dar verde (los de bugs están desactivados).
5. `ci: verificar núcleo, motor y frontend` — el workflow; confirmar que corre en GitHub.
6. Un commit `fix(...)` por bug, en orden B1, B6, B3+B5, B2, B4. Cada uno: sacar
   `@Disabled`, arreglar, regenerar motor, mover el caso en el smoke. `Refs: Bn`.
7. `docs: sincronizar README y especificación con la versión sin servidor` (R3, R4).
8. `docs(decisiones): ...` + `refactor(repo): ...` para la opción E.
9. `refactor(vm): extraer monitores a su paquete` (opción H), antes de cualquier concepto nuevo.
10. Features de alto valor y bajo costo: semilla visible y reproducible, selector de
   política, `ejemplos/` compartidos, programa en la URL.

---

## 10. Preguntas abiertas para Fede

1. ¿El SRS y la propuesta de PPS se sacaron a propósito? ¿Dónde viven ahora?
2. ¿La cátedra validó el cambio a turnos paralelos (`PROB_AVANCE = 80`)? ¿El 80 sale de algún
   criterio o es provisorio?
3. ¿Hay intención de mantener la API REST para algo (entregas, integración con otra
   herramienta) o se puede borrar?
4. ¿El *time-travel* y la línea de tiempo del README siguen en los planes? Si sí, conviene
   diseñarlos junto con el arreglo de B6 (re-simular desde la semilla en lugar de guardar
   todo).
5. ¿Trabaja solo o se suma alguien? Cambia cuánto conviene formalizar PRs.
6. ¿Qué conceptos vienen después de monitores y en qué orden? ¿La cátedra permite combinar
   conceptos en un mismo programa (por ejemplo, monitores y mensajes)?
7. Convención de idioma para identificadores: el kit propone inglés técnico para el código
   y español para todo lo demás, porque es lo que predomina hoy. Si prefiere todo en
   español, se cambia en `convenciones-codigo` antes de que los agentes empiecen a generar.
