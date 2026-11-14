---
name: documentar-pps
description: >
  Redactar y mantener la documentación del simulador y los entregables de la Práctica
  Profesional Supervisada (propuesta, SRS, informes de avance, informe final, manual de
  usuario, decisiones de diseño) con registro académico formal, correcto y sin rasgos de
  texto generado por IA. También mantiene sincronizados README y docs del lenguaje con el
  código. Usala SIEMPRE que haya que escribir o corregir cualquier documento, sección,
  resumen, introducción, conclusión, ADR o texto para la cátedra, cuando el usuario diga
  "documentá", "redactá", "informe", "SRS", "propuesta", "PPS", "que quede formal", o
  cuando el código cambie algo que un documento describe.
---

# Documentación y entregables de la PPS

Un entregable de PPS lo lee un tribunal que evalúa rigor, claridad y criterio profesional.
Un texto que "suena a IA" resta credibilidad aunque el contenido sea correcto. El estándar
es: **podría firmarlo un profesional del área y defenderlo oralmente línea por línea.**

## Antes de escribir

1. Preguntar si no está claro: destinatario (cátedra de PPS, tutor, alumnos), formato
   (Markdown, LaTeX, Word), normas de la cátedra (plantilla, extensión, citas), y dónde
   vive el documento. El SRS y la propuesta ya no están en `docs/`: preguntar su ubicación.
2. Verificar cada afirmación técnica contra el código, un test o una medición. Nada se
   describe como implementado si no lo está.
3. Leer `references/estilo-academico.md` completo. Es obligatorio para entregables.

## Al terminar

1. Correr `node scripts/revisar-estilo.mjs <archivo>` y resolver cada marca (o justificar
   por qué se mantiene).
2. Releer con la lista de control de `references/estilo-academico.md`.
3. Entregar el texto sin comentarios propios dentro del documento ("Aquí tienes…",
   "Espero que sirva…"). Las aclaraciones al usuario van fuera del documento.

## Mapa de documentos del repositorio

| Documento | Destinatario | Se actualiza cuando |
|---|---|---|
| `README.md` | quien llega al repo | cambia cómo se ejecuta, la arquitectura o el alcance |
| `docs/lenguaje/*.md` (una página por tema e instrucción) | alumno | cambia el lenguaje |
| `docs/lenguaje/especificacion.md` | docente, desarrollador | cambia el lenguaje (EBNF y semántica) |
| `docs/monitores/*.md` | alumno | la cátedra cambia la notación o la teoría |
| `docs/simulador/*.md` | alumno, docente | cambia la interfaz |
| `docs/ejemplos.md` | alumno | cambian los programas de `ejemplos/` |
| `docs/decisiones/NNNN-*.md` | tribunal, futuros desarrolladores | cada decisión de arquitectura o alcance |
| `CHANGELOG.md` | todos | cada commit (ver skill `commit`) |
| `docs/pps/*` | cátedra de PPS | hitos de la PPS |

## ADR

Plantilla en `references/adr-plantilla.md`, numeración correlativa, una decisión por
archivo, nunca se borran (se reemplazan con otra). Son la materia prima de la sección de
decisiones de diseño del informe final.

## Estructura sugerida del informe final de PPS

Ajustar a la plantilla de la cátedra si existe. Sin plantilla:
1. Resumen (150–250 palabras) y palabras clave.
2. Introducción: contexto (la materia, el problema didáctico), objetivos general y
   específicos, alcance y límites.
3. Marco conceptual: conceptos de concurrencia involucrados, con citas a la bibliografía
   de la cátedra.
4. Antecedentes: herramientas existentes y por qué no alcanzan.
5. Requerimientos (resumen del SRS).
6. Diseño: arquitectura, lenguaje, máquina virtual, decisiones (ADR).
7. Implementación: tecnologías y justificación, aspectos relevantes, dificultades.
8. Verificación: estrategia de pruebas, resultados, métricas reproducibles.
9. Resultados y evaluación con usuarios, si la hubo.
10. Conclusiones y trabajo futuro.
11. Referencias. Anexos (manual de usuario, gramática completa).
