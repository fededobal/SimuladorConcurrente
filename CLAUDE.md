# Simulador de Concurrencia (UNLP) — contexto para Claude

PPS (Analista en TIC, Facultad de Informática, UNLP) de Federico Dobal. Herramienta
didáctica para Programación Concurrente: el alumno escribe pseudocódigo con la notación de
la cátedra y lo ve ejecutarse paso a paso. **El alcance es solo monitores** (*signal and
continue*); no se suman otros conceptos (ADR 0003). Lo que viene es visualización: visor de
variables, variables condición y sus colas, estructuras de datos (`Cola`, `ColaOrdenada`,
arreglos) y un historial en forma de línea de tiempo (sin *time-travel*).

Usuarios: alumnos y docentes. La claridad de lo que se ve importa tanto como que el código
ande.

## Stack

Núcleo en **Java 21** compilado a JavaScript con **TeaVM**; interfaz en **React 19 +
TypeScript + Vite**. Todo corre en el navegador; no hay servidor en producción (Vercel
sirve estáticos). No proponer cambiar de lenguajes ni de stack.

```
nucleo/src/main/java/ar/edu/unlp/info/simulador/
  lang/   lexer → parser → AST → SemanticValidator (+ ExprTyper, Scope)  (Java puro)
  vm/     VirtualMachine y primitivas                    (Java puro, solo java.util)
  js/     SimuladorJs (@JSExport) + Json (a mano)        ← puente al navegador
        └─ TeaVM (mvn -Pweb) ─→ frontend/src/engine/simulador.js  ← GENERADO, commiteado
frontend/src/api.ts → useSimulation.ts → componentes
```

## Comandos

| Qué | Dónde | Comando |
|---|---|---|
| Levantar | raíz | `./dev.sh` → http://localhost:5173 |
| Tests del núcleo | `nucleo/` | `mvn -q test` (con JDK 21: si `java` es otra versión, fijar `JAVA_HOME`) |
| Regenerar motor | `frontend/` | `npm run engine` |
| Probar motor compilado | `frontend/` | `npm run smoke` |
| Chequeo completo del front | `frontend/` | `npm run check` |
| Estilo de un documento formal | raíz | `node scripts/revisar-estilo.mjs <archivo>` |

## Reglas que no se negocian

1. **Nunca editar `frontend/src/engine/simulador.js` a mano.** Se arregla el Java y se regenera.
2. Tocar `lang/`, `vm/`, `js/` o `pom.xml` ⇒ en el mismo commit van `simulador.js` y
   `simulador.hash` regenerados (lo verifican el hook y el CI).
3. **Todo commit**: `prefijo(alcance): mensaje`, línea en blanco y descripción siempre que
   se pueda, **más una entrada en `CHANGELOG.md` con autor y fecha**. Skill `commit`.
4. Todo cambio de comportamiento lleva test (JUnit; y caso en `scripts/smoke-motor.mjs`
   si el alumno lo ve).
5. Todo cambio del lenguaje actualiza la referencia y la especificación (EBNF).
6. Errores que ve el alumno: español, con línea, sin nombres de clases Java. Ninguna
   función de `SimuladorJs` lanza excepción.
7. Código según la skill `convenciones-codigo` (identificadores en inglés, comentarios,
   textos y docs en español, núcleo determinista, sin dependencias nuevas sin preguntar).
8. Documentos para la PPS: formales, verificados y sin rasgos de texto de IA. Skill
   `documentar-pps`.

## Semántica

Fuente de verdad: la teoría de la cátedra en `docs/monitores.md`. Modelo, invariantes y
casos canónicos: skill `semantica-concurrencia`.
Decisiones vigentes: *signal and continue* en monitores; un instante puede avanzar varios
procesos (`PROB_AVANCE`); no hay variables globales; llamadas abiertas entre monitores
(ADR 0004); tipos controlados al compilar (solo `int`→`double` y número→`text`); el azar
sale de `vm/Azar` para que la JVM y el navegador coincidan.

## Skills (`.claude/skills/`)

| Skill | Cuándo |
|---|---|
| `convenciones-codigo` | antes de escribir o revisar cualquier código |
| `commit` | cada commit: partir, CHANGELOG, mensaje con descripción |
| `motor-java-js` | cambios en `lang/`, `vm/`, `js/`: tests → regenerar → smoke |
| `extender-lenguaje` | agregar/cambiar una construcción del lenguaje |
| `semantica-concurrencia` | modificar la VM o explicar un resultado |
| `revisar-codigo` | revisar un diff antes de commitear o un PR |
| `documentar-pps` | cualquier documento, README o entregable de la PPS |

## Cómo trabajar en este repo

- Cambio de más de un archivo: plan corto primero, esperar OK.
- Mostrar diff/resumen antes de commitear; nunca `git push` sin pedido.
- Si un pedido contradice la teoría de la cátedra o estas reglas, decirlo antes de hacerlo.
- Informe de revisión (bugs B1–B6, ya corregidos, y propuestas): `docs/informe-revision.md`.
  Decisiones vigentes: `docs/decisiones/`.
