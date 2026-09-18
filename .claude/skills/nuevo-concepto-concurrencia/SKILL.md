---
name: nuevo-concepto-concurrencia
description: >
  Proceso y arquitectura para incorporar al simulador un concepto de concurrencia nuevo
  (semáforos, locks, barreras, variables compartidas con await, pasaje de mensajes
  sincrónico o asincrónico, canales, lectores/escritores, o cualquier otro tema de la
  cátedra) sin romper los existentes. Define cómo se organiza el núcleo por concepto, cómo
  se eligen los "modelos" del lenguaje, cómo se visualiza cada primitiva y en qué orden se
  trabaja. Usala siempre que el pedido sea "agregar semáforos", "soportar mensajes",
  "nuevo tema", "que también simule X", o cuando un cambio introduzca una primitiva de
  sincronización nueva, aunque parezca chica.
---

# Agregar un concepto de concurrencia

El simulador va a crecer de monitores a muchos temas. Cada concepto nuevo es un proyecto
en sí: no se agrega "de pasada" dentro de otra tarea.

## Principios de diseño

1. **Una VM, muchas primitivas.** Procesos, instantes, scheduler, deadlock, eventos y
   snapshots son comunes. Cada concepto aporta solo sus primitivas y sus sentencias.
2. **Cada concepto en su propio paquete** del runtime (`vm/monitores`, `vm/semaforos`,
   `vm/mensajes`, …). `VirtualMachine` no implementa primitivas: delega.
3. **Modelos explícitos.** Cada programa se compila bajo un modelo (o una combinación
   permitida) que elige el usuario o el ejercicio. El validador rechaza construcciones de
   otro modelo con un mensaje claro ("`P(s)` pertenece a Semáforos; este programa usa
   Monitores"). Motivo: la cátedra enseña los temas por separado y mezclar primitivas sin
   querer confunde al alumno.
4. **Vista genérica de recursos.** El snapshot describe recursos con una forma común
   (tipo, nombre, estado, dueño, colas), así el puente JSON y `types.ts` no cambian con
   cada concepto; la UI elige el panel según el tipo.
5. **Canónicos primero.** Los programas de la cátedra que definen el concepto se escriben
   como tests antes que el código.

## Estructura objetivo

```
nucleo/src/main/java/ar/edu/unlp/info/simulador/
  lang/
    lexer/          palabras reservadas agrupadas por modelo
    parser/         una sección/método por modelo
    parser/ast/     TODOS los nodos acá (restricción de Java: una interfaz sealed fuera de
                    un módulo con nombre solo permite subtipos del mismo paquete).
                    Se agrupan por comentarios y orden, no por subpaquetes.
    Modelo.java     enum de modelos + qué construcciones habilita cada uno
    SemanticValidator.java  reglas comunes + validadores por modelo
  vm/
    VirtualMachine.java     scheduler, instantes, delega por tipo de sentencia
    ContextoEjecucion.java  lo que una primitiva puede pedirle a la VM:
                            bloquear, despertar, emitir evento, error con línea
    monitores/  semaforos/  mensajes/  …   un runtime por concepto
    vista/      Snapshot, RecursoView genérico, LogEntry
  js/           puente (recibe el modelo como parámetro de crear)
web/src/componentes/recursos/
  PanelMonitor.tsx  PanelSemaforo.tsx  …   + un registro tipo → componente
ejemplos/<concepto>/*.mon                    programas canónicos compartidos
docs/teoria/<concepto>.md                    teoría de la cátedra
```

Hoy el código tiene la lógica de monitores dentro de `VirtualMachine`. La extracción a
`vm/monitores/` es el primer paso **antes** de agregar el segundo concepto, en un commit
`refactor(vm)` separado y con todos los tests en verde. No mezclar esa extracción con la
primitiva nueva.

## Proceso, en orden

1. **Teoría**: conseguir la notación y semántica exacta de la cátedra → `docs/teoria/<concepto>.md`.
2. **Referencia**: `.claude/skills/semantica-concurrencia/references/<concepto>.md` desde la
   plantilla, y agregar la fila a la tabla de esa skill.
3. **ADR**: sintaxis elegida, modelo, visualización, qué queda fuera de alcance.
4. **Plan**: mostrarle al usuario sintaxis, ejemplos, errores nuevos y cambios en la UI.
   Esperar OK.
5. **Tests rojos**: canónicos en JUnit y en `scripts/smoke-motor.mjs`; programas en
   `ejemplos/<concepto>/`.
6. **Lenguaje**: skill `extender-lenguaje` (lexer, AST, parser, validador por modelo).
7. **Runtime**: paquete `vm/<concepto>/` que usa solo `ContextoEjecucion`.
8. **Vista y puente**: `RecursoView` + `Json.java` + `types.ts` si hiciera falta un campo
   nuevo; panel en la UI.
9. **Motor**: skill `motor-java-js`.
10. **Docs y cambios**: referencia del lenguaje, especificación (EBNF), README, CHANGELOG.

Cada paso son uno o más commits que compilan y pasan tests.

## Chequeo final

- Los canónicos de **todos** los conceptos siguen en verde.
- Un programa de un modelo no compila bajo otro modelo, con mensaje claro.
- Las invariantes globales de `semantica-concurrencia` se cumplen con la primitiva nueva
  (en particular: un error libera el recurso).
- La UI muestra quién tiene el recurso y quién espera, con el mismo lenguaje visual que el
  resto.
