# Java (núcleo: lang, vm, js)

Java 21. Compatible con TeaVM: solo `java.lang` y `java.util` salvo que se verifique otra
cosa con `npm run engine` + `npm run smoke`.

## Nombres
- Paquetes en minúscula, singular por responsabilidad: `lang.lexer`, `vm.monitores`.
- Clases `PascalCase` sustantivos (`ConditionVariable`); métodos `camelCase` verbos
  (`enqueue`, `evalBool`); constantes `UPPER_SNAKE_CASE`.
- Booleanos como pregunta: `isFree`, `hasVar`, `needsLock`.
- Acrónimos como palabra: `JsonWriter`, no `JSONWriter`.

## Tipos
- Datos inmutables → `record`. Jerarquías cerradas → `sealed interface` + records.
- Recorrer jerarquías con `switch` exhaustivo con patterns; **sin `default`** en switches
  sobre sealed (el compilador tiene que avisar cuando falta un caso).
- Clases utilitarias: `final` + constructor privado.
- Clases no pensadas para herencia: `final`.

## Null
- En el AST, `null` significa "ausente" solo en campos documentados (`elseBranch`,
  `index`, `quant`). En colecciones, nunca `null`: lista vacía.
- Los resolvers de nombres devuelven `null` = no existe; quien llama lo convierte en error
  con línea.

## Estructura de un método
- Validar al principio y salir temprano; el camino feliz al final sin anidar.
- Máximo ~40 líneas; extraer métodos privados con nombre que explique.
- Nada de lógica de dominio en el puente `js/`: solo traducción de tipos y errores.

## Colecciones y performance
- `ArrayList`, `ArrayDeque`, `LinkedHashMap` (orden estable = salida reproducible).
- No copiar el estado completo por evento (bug B6): snapshots bajo demanda o acotados.

## Javadoc
- Primera oración: qué es/qué hace. Después, invariantes y porqués.
- `@param`/`@return` solo si agregan algo al nombre.

## Tests (JUnit 5)
- Clase `<Unidad>Test` en el mismo paquete. Un comportamiento por test.
- Programas de prueba en text blocks o desde `ejemplos/`.
- Helpers en `TestSupport`; no duplicar bucles de ejecución.
- Tests de bugs pendientes: `@Disabled("Bn: descripción")`, nunca borrados.
- Golden master: `CharacterizationTest` (la VM, por el puente) y
  `CompileErrorsCharacterizationTest` (cada mensaje de error del compilador) comparan con
  `src/test/resources/characterization/`. Un refactor no puede cambiarlos; si un cambio de
  comportamiento es intencional, se regeneran con
  `mvn test -Dcharacterization.regenerate=true` y el diff se revisa en el commit.
