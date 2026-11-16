# Núcleo (lang + vm + puente js)

Convenciones: skill `convenciones-codigo` (leer `references/java.md` antes de escribir).
El alcance es solo monitores (ADR 0003). `VirtualMachine` coordina y delega: `Scheduler`
(turno), `StatementExecutor` (sentencias), `MonitorProtocol` (exclusión mutua, colas y
signal and continue), `EventLog` y `SimulationClock`. Lo nuevo va en el colaborador que
corresponde; si alguno pasa de ~400 líneas, partirlo antes en un commit `refactor(vm)`.

Es el **motor** del simulador (por eso `nucleo/` y no `backend/`). Casi todo corre en el navegador vía TeaVM.

- `lang/` y `vm/`: Java 21 puro. Nada de Spring, reflexión, `Class.forName`, serialización
  automática, hilos ni I/O. TeaVM compila estático: lo que no alcanza desde
  `js/SimulatorJs` no existe en el navegador.
- Records + `sealed interface` + `switch` con pattern matching es el estilo del AST y de
  `Value`. Mantenerlo: al agregar un caso nuevo, el compilador te marca cada `switch` que
  falta completar — es la checklist gratis.
- Errores: `CompilationException(mensaje, linea)` en compilación; `RuntimeError(mensaje, linea)`
  en ejecución. Nunca dejes escapar otra excepción (ArithmeticException,
  NumberFormatException, IndexOutOfBounds…): convertila.
- Todo mensaje al alumno en español, sin tildes rotas (el archivo es UTF-8) y con línea.
- No hay servidor: la API REST de Spring se eliminó (ADR 0001). Si algún día hace falta,
  está en el historial de git.
- Tests: `TestSupport.run(src, policy, seed, maxSteps)` y `finalVar(...)`. Con
  `RANDOM` probá varias semillas (0..24) como en `VirtualMachineTest`.
- Golden master (`CharacterizationTest`, `CompileErrorsCharacterizationTest`): fijan cada
  evento, mensaje y el orden en que se consume el azar. Un refactor tiene que dejarlos en
  verde sin regenerar; solo un cambio de comportamiento intencional los regenera
  (`mvn test -Dcharacterization.regenerate=true`) y el diff va en el mismo commit.
- Después de tocar algo acá: `mvn -q test` → `cd ../frontend && npm run engine && npm run smoke`.
