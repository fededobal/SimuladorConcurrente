---
name: extender-lenguaje
description: >
  Checklist completa para agregar, cambiar o quitar una construcción del lenguaje de
  monitores del simulador (palabra reservada, sentencia, operador, tipo, forma de for,
  parámetro, operación de cola, etc.). Un cambio así toca unos diez lugares entre Java,
  TypeScript y docs, y olvidarse uno deja el editor, el validador o la documentación
  desincronizados. Usala siempre que el pedido sea del tipo "agregá X al lenguaje",
  "que se pueda escribir Y", "soportar Z de la cátedra", "sacá inout", "nuevo tipo",
  "nueva instrucción", o cuando se toque Lexer.KEYWORDS, Parser, Stmt, Expr o Type.
---

# Extender el lenguaje

Antes de codificar, escribí en 3–5 líneas y mostrale al usuario:
1. la sintaxis exacta (con un ejemplo de programa de la cátedra que la use),
2. la semántica (¿consume un instante? ¿puede bloquear? ¿dónde se permite: monitor,
   procedure, proceso?),
3. qué errores de compilación nuevos aparecen y con qué mensaje,
4. si rompe programas existentes (⇒ commit con `!` y `BREAKING CHANGE`).
Si contradice `docs/monitores/`, frená y preguntá: la notación la define la cátedra.

## Lugares a tocar, en orden

Rutas relativas a `nucleo/src/main/java/ar/edu/unlp/info/simulador/` salvo indicación.

| # | Dónde | Qué |
|---|---|---|
| 1 | `lang/lexer/Lexer.java` → `KEYWORDS` (y `TWO_CHAR`/`SINGLE_CHAR` si es símbolo) | palabra/símbolo nuevo |
| 2 | `lang/parser/ast/Stmt.java` o `Expr.java` (o `Type.java`) | record nuevo; agregarlo al `permits` si es `Stmt` |
| 3 | `lang/parser/Parser.java` | producción nueva; mensajes "Se esperaba …" en español |
| 4 | `lang/SemanticValidator.java`, `lang/ExprTyper.java`, `lang/Scope.java` | `checkStmt` (alcance, dónde se permite, aridad), tipos de expresiones (`typeOf`) y nombres (sin tapado) |
| 5 | `vm/VirtualMachine.java` → `executeStmt` | ejecución; `yield true` si consume instante; `event(...)` con mensaje legible |
| 6 | `vm/ExprEvaluator.java` / `vm/Value.java` | si es expresión o tipo |
| 7 | `vm/Snapshot.java` + `js/Json.java` + `frontend/src/types.ts` | solo si el alumno tiene que *ver* algo nuevo |
| 8 | `frontend/src/components/CodeEditor.tsx` → `KEYWORDS` | resaltado; misma lista que el Lexer |
| 9 | `docs/lenguaje/` (la página del tema o de la instrucción; `sentencias.md` si cambia la tabla) | explicación para el alumno + ejemplo |
| 10 | `docs/lenguaje/especificacion.md` | regla EBNF y semántica formal |
| 11 | `README.md` (lista de "El lenguaje") | una línea |
| 12 | Tests | `CompilerTest` (acepta/rechaza), `VirtualMachineTest` (comportamiento), `scripts/smoke-motor.mjs` (un caso) |
| 13 | Motor | `npm run engine && npm run smoke` (skill `motor-java-js`) |

Truco: `Stmt`, `Expr` y `Value` son `sealed` y se recorren con `switch` exhaustivos. Al
agregar un record, compilá (`mvn -q test-compile`): cada `switch` incompleto es un error y
te marca un lugar de la tabla (hoy: ~15 casos en `SemanticValidator`, ~9 en `ExprTyper`,
~12 en `VirtualMachine`, ~9 en `ExprEvaluator`). No agregues `default ->` para silenciarlo.

## Para quitar algo

Mismo recorrido al revés, más: un mensaje de error claro si alguien escribe la construcción
vieja ("'inout' ya no existe: usá out y leé el valor antes"), un test que lo verifique, y
`BREAKING CHANGE` en el commit.

## Commits

Una feature de lenguaje completa y coherente puede ir en un solo commit
`feat(lenguaje): …` si incluye tests, docs y motor. Si la hiciste en varios pasos, que
cada commit compile y pase tests.
