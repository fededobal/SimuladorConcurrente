# TypeScript + React (interfaz)

TypeScript estricto (`strict` en tsconfig), React 19 con componentes funcionales y hooks.

## Nombres y archivos
- Componentes `PascalCase.tsx`, un componente exportado por archivo, export con nombre
  (sin `export default`, como hoy `App`).
- Hooks `useAlgo.ts`; utilidades y tipos `camelCase.ts`.
- Tipos e interfaces `PascalCase`; uniones de literales para estados (`'idle' | 'ready' | …`).

## Tipos
- Prohibido `any`. Si un dato viene de afuera (JSON del motor), se tipa en `types.ts` y se
  valida/parsea en un solo lugar (`api.ts`).
- `types.ts` espeja `Snapshot`/`LogEntry` y `Json.java`: cambiar los tres juntos.
- Preferir `readonly` en props y datos que no se mutan.

## Arquitectura de la interfaz
- Solo `api.ts` (o su sucesor `motor/cliente.ts`) importa `engine/`.
- Estado de la simulación en un hook (`useSimulation`); los componentes reciben datos y
  callbacks por props, no llaman al motor.
- Un componente por panel (variables, variables condición, estructuras de datos,
  historial), que recibe su parte del snapshot por props.
- Nada de lógica de simulación en la UI: si algo se calcula sobre el estado de la VM, va
  al núcleo y llega en el snapshot.

## Hooks
- Respetar las reglas de hooks (el lint `react-hooks` las verifica).
- Timers e intervalos siempre con limpieza en el `return` del efecto.
- `useCallback`/`useMemo` cuando se pasan a hijos o hay costo real; no por reflejo.

## Estilos y accesibilidad
- CSS con variables en `index.css` (o módulos CSS si crece); sin estilos inline salvo
  valores dinámicos (colores de proceso).
- Botones con texto o `aria-label`; el color nunca es la única señal (estado también en
  texto o forma), porque hay alumnos daltónicos y proyectores que lavan colores.

## Textos
- Español rioplatense neutro, pensado para alguien que está aprendiendo. Centralizar
  etiquetas repetidas en constantes (como `STATUS_LABEL`).

## Calidad
- `npm run check` antes de commitear (lint + tipos + build + smoke).
- Sin `console.log` en commits; sin `// @ts-ignore` sin comentario del porqué.
