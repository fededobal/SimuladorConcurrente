---
name: motor-java-js
description: >
  Flujo obligatorio para cualquier cambio en el núcleo Java del simulador
  (backend/.../lang, vm, js o pom.xml) que termina compilado a JavaScript con TeaVM en
  frontend/src/engine/simulador.js. Cubre qué APIs de Java se pueden usar, cómo mantener
  el puente SimuladorJs/Json alineado con types.ts, y la secuencia tests → regenerar →
  smoke. Usala siempre que se modifique el lexer, parser, validador, la VirtualMachine,
  Value, Snapshot, el puente js/, o cuando algo "anda en los tests pero no en el
  navegador", o aparezca un error raro de TeaVM.
---

# Motor Java → JS

El mismo código Java corre en dos lugares: la JVM (tests) y el navegador (TeaVM). Un
cambio está terminado cuando anda en **los dos**.

## Secuencia

```bash
cd backend && mvn -q test                 # 1. lógica correcta en la JVM
cd ../frontend && npm run engine          # 2. compila a simulador.js + actualiza simulador.hash
npm run smoke                             # 3. el JS compilado se comporta igual
npm run build                             # 4. el front sigue tipando contra el motor
```
Si el paso 2 falla y el 1 no, el problema es de compatibilidad con TeaVM, no de lógica.

## Qué se puede usar en lang/, vm/, js/

TeaVM compila estáticamente y trae su propia implementación de la biblioteca estándar.
Reglas prácticas:
- Seguro: `java.lang` básico, `java.util` (colecciones, `Random`), records, sealed
  interfaces, `switch` con patterns, text blocks, lambdas y streams simples.
- Evitar: reflexión (`getClass().getDeclaredFields()`, `Class.forName`), serialización
  automática (Jackson; por eso existe `Json.java`), hilos/`synchronized` con intención real,
  `java.io`/`java.nio` de archivos, `System.getenv`.
- Ante la duda con otra API (formateo de números, `java.time`, regex complejas): usala,
  corré el paso 2 y 3, y si algo difiere, reemplazala por código simple.
- `long` en JS: TeaVM lo emula; es correcto pero más lento. No es un problema a esta escala.

## Puente al navegador (js/)

- `SimuladorJs` exporta funciones con `@JSExport` que reciben/devuelven tipos simples y
  `String` con JSON. Mantenerlo así: cruzar objetos Java a JS es frágil.
- **Ninguna función exportada puede lanzar.** Envolvé el cuerpo en
  `try { ... } catch (CompilationException e) {...} catch (RuntimeError e) {...}
  catch (RuntimeException e) {...}` y devolvé `Json.error(mensajeEnEspañol, linea)`.
  Una excepción que cruza a JS llega al alumno como `Error: null` o en inglés.
- Si agregás/cambiás un campo en `Snapshot`, `LogEntry` o un record de vista:
  1. `vm/Snapshot.java` o `vm/LogEntry.java`
  2. `js/Json.java` (serialización a mano; el orden de campos no importa, los nombres sí)
  3. `frontend/src/types.ts`
  4. `SimuladorJsTest` (contrato) y, si es visible, un chequeo en `scripts/smoke-motor.mjs`
  5. `frontend/src/engine/simulador.d.ts` solo si cambia la firma de una función exportada

## Commit

Java + `simulador.js` + `simulador.hash` en el mismo commit (el hook lo exige). Usá la
skill `commit`. Nunca edites `simulador.js` a mano ni lo formatees.

## Síntomas y causa probable

| Síntoma | Causa probable |
|---|---|
| Tests JUnit verdes, smoke rojo | API no soportada/distinta en TeaVM, o `simulador.js` viejo |
| `Error: null` o texto en inglés en la UI | excepción no atrapada en `SimuladorJs` |
| El front no ve un campo nuevo | faltó `Json.java` o `types.ts` |
| CI: "el núcleo cambió pero simulador.js no se regeneró" | faltó `npm run engine` antes del commit |
| `simulador.js` cambió sin tocar Java | cambió la versión de TeaVM en el `pom.xml`: commit `build(motor)` aparte |
