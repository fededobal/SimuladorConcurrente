# Núcleo (lang + vm + puente js)

Convenciones: skill `convenciones-codigo` (leer `references/java.md` antes de escribir).
El núcleo va a soportar varios conceptos de concurrencia: cada primitiva nueva en su propio
paquete de `vm/` y detrás de un modelo explícito (skill `nuevo-concepto-concurrencia`).

Esto no es un "backend": es el **motor** del simulador. Casi todo corre en el navegador vía TeaVM.

- `lang/` y `vm/`: Java 21 puro. Nada de Spring, reflexión, `Class.forName`, serialización
  automática, hilos ni I/O. TeaVM compila estático: lo que no alcanza desde
  `js/SimuladorJs` no existe en el navegador.
- Records + `sealed interface` + `switch` con pattern matching es el estilo del AST y de
  `Value`. Mantenerlo: al agregar un caso nuevo, el compilador te marca cada `switch` que
  falta completar — es la checklist gratis.
- Errores: `CompilationException(mensaje, linea)` en compilación; `RuntimeError(mensaje, linea)`
  en ejecución. Nunca dejes escapar otra excepción (ArithmeticException,
  NumberFormatException, IndexOutOfBounds…): convertila.
- Todo mensaje al alumno en español, sin tildes rotas (el archivo es UTF-8) y con línea.
- `api/` (Spring) no lo usa el frontend. No agregues features ahí salvo que se decida
  reactivar el servidor (ver `docs/decisiones/`).
- Tests: `TestSupport.run(src, policy, seed, maxSteps)` y `finalVar(...)`. Con
  `RANDOM` probá varias semillas (0..24) como en `VirtualMachineTest`.
- Después de tocar algo acá: `mvn -q test` → `cd ../frontend && npm run engine && npm run smoke`.
