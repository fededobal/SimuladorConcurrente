# Frontend (React 19 + TypeScript + Vite)

Convenciones: skill `convenciones-codigo` (leer `references/typescript.md` antes de escribir).
Los paneles nuevos (variables, variables condición, estructuras de datos, historial) leen
el snapshot que llega por `useSimulation`; no llaman al motor.

- `src/engine/simulador.js` es GENERADO por TeaVM. No se edita, no se formatea, no se lintea.
  `src/engine/simulador.d.ts` sí se mantiene a mano y tiene que coincidir con `SimulatorJs.java`.
- `src/api.ts` es la única puerta al motor. El resto del front no importa `engine/` directo.
- `src/types.ts` espeja los records de `vm/Snapshot.java` y `vm/LogEntry.java` y la
  serialización de `js/Json.java`. Cambiar uno implica cambiar los tres.
- El motor es sincrónico y corre en el hilo principal: nada de bucles largos de `step()` sin
  ceder al navegador (ver informe, opción "Web Worker").
- Textos de la UI en español rioplatense neutro, pensados para un alumno que está aprendiendo.
- Antes de commitear: `npm run check`.
