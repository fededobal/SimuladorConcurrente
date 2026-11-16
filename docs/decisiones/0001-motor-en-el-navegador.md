# 0001. Ejecutar el motor en el navegador compilando Java con TeaVM

- Estado: aceptada (a completar/ajustar por Federico)
- Fecha: 2026-09-18

## Contexto
La primera versión tenía el núcleo (lexer, parser, validador, VM) en Java detrás de una API
REST en Spring Boot, desplegada en un servicio gratuito (Render). Cada paso de la simulación
era una petición HTTP, y la ejecución completa, un bucle de peticiones. En la práctica la
aplicación resultaba lenta: latencia por paso, más el tiempo de arranque del servicio
gratuito cuando estaba inactivo. Además, el simulador no necesita nada que solo un servidor
pueda dar: no hay datos compartidos entre usuarios ni persistencia.

## Alternativas
1. **Mantener la API REST** y optimizarla (batch de pasos, WebSocket, plan pago). Conserva
   el diseño original, pero sigue dependiendo de un servidor para algo que es cómputo local.
2. **Reescribir el núcleo en TypeScript.** Elimina Java, pero tira el código ya probado, los
   tests JUnit y la legibilidad que se buscaba con Java.
3. **Compilar el núcleo Java a JavaScript con TeaVM** y ejecutarlo en el navegador. Mantiene
   Java como lenguaje del núcleo y los tests en la JVM, y elimina el servidor.

## Decisión
Opción 3. El núcleo sigue en Java (solo `java.util`, sin Spring), se agrega un puente
(`js/SimulatorJs` + `js/Json`) que TeaVM compila a `frontend/src/engine/simulador.js`, y el
frontend lo invoca de forma sincrónica. El sitio se publica como estático (Vercel).

## Consecuencias
- Sin latencia de red ni costo de servidor; funciona sin conexión una vez cargado.
- El artefacto `simulador.js` es generado y se commitea (el hosting no tiene JDK). Riesgo de
  que quede desactualizado respecto del Java: mitigado con `simulador.hash`, el hook
  `pre-commit` y el CI.
- Hay dos lugares donde el mismo código puede comportarse distinto (JVM y TeaVM): se agrega
  `scripts/smoke-motor.mjs`, que prueba el motor compilado.
- La serialización a JSON es manual (TeaVM no soporta Jackson): el contrato con
  `frontend/src/types.ts` se mantiene a mano y se prueba en `SimulatorJsTest`.
- La API REST de Spring quedó sin uso por el frontend y se eliminó el 2026-09-18 junto con
  la dependencia de Spring Boot. Si en el futuro hiciera falta un servidor (por ejemplo, para
  entregas), el código está en el historial de git.
- El motor corre en el hilo principal del navegador; ejecuciones pesadas pueden trabar la
  interfaz. Opción futura: Web Worker.
