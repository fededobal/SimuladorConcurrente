# Guía de estilo para documentos formales

## 1. Registro

- Impersonal o primera persona del plural académica, sostenida en todo el documento
  ("se diseñó", "se optó por"; o "diseñamos" si la cátedra lo acepta). No mezclar.
- Tiempos verbales: pasado para lo realizado, presente para describir el sistema,
  futuro solo para trabajo futuro.
- Español neutro formal. Sin voseo, sin coloquialismos, sin anglicismos evitables
  ("implementar" sí; "deployar", "setear", "testear" no → "desplegar", "configurar",
  "probar"). Términos técnicos sin traducción aceptada, en cursiva la primera vez
  (*signal and continue*, *deadlock* → mejor "interbloqueo (*deadlock*)").
- Definir cada término técnico la primera vez que aparece. Mantener un glosario.

## 2. Rasgos de texto generado por IA que se eliminan

Palabras y fórmulas vacías o infladas:
- "crucial", "fundamental", "clave" (como adjetivo), "robusto", "integral", "holístico",
  "sinergia", "potenciar", "aprovechar al máximo", "de manera eficiente", "innovador",
  "vanguardia", "sin precedentes", "en el mundo actual", "en la era digital".
- "Cabe destacar que", "Es importante mencionar", "Vale la pena señalar",
  "En este sentido", "En resumen", "En conclusión" al inicio de un párrafo cualquiera,
  "Sin lugar a dudas", "No solo… sino también" repetido, "Esto permite…" en cadena.
- Preguntas retóricas, exclamaciones, emojis, frases motivacionales.

Estructura:
- Enumeraciones de exactamente tres adjetivos o tres elementos por reflejo.
- Párrafos que terminan con una frase-resumen que repite el párrafo.
- Abuso de raya (—) para incisos: usar comas, paréntesis o dos oraciones.
- Abuso de listas con viñetas en lugar de prosa argumentada. En un informe académico, las
  ideas se desarrollan en párrafos; las listas solo para elementos realmente enumerables
  (requisitos, pasos, componentes).
- Negritas para enfatizar dentro de la prosa. Solo en títulos y términos definidos.
- Títulos con dos puntos y subtítulo marketinero ("Arquitectura: el corazón del sistema").
- Simetría artificial: todas las secciones con la misma longitud y el mismo molde.

Contenido:
- Afirmaciones sin sustento ("mejora notablemente el aprendizaje"). Toda afirmación
  evaluativa lleva dato, cita o se reformula como objetivo o hipótesis.
- Generalidades aplicables a cualquier proyecto. Cada párrafo debe decir algo que solo es
  cierto de este proyecto.
- Hedging excesivo ("podría potencialmente contribuir a…").

## 3. Precisión

- Cifras con unidad, fuente y forma de obtenerlas: "0,3 ms por paso con 4 procesos
  (medido con `scripts/…`, Node 22, 2000 pasos)".
- Nombres exactos de tecnologías y versiones cuando importan (Java 21, TeaVM 0.x,
  React 19).
- Separador decimal coma, miles con punto o espacio fino, según la norma de la cátedra.
- Distinguir implementado / en desarrollo / propuesto.

## 4. Elementos formales

- Figuras y tablas numeradas, con título, citadas en el texto antes de aparecer
  ("Tabla 3"), fuente si no son propias.
- Citas con el estilo que pida la cátedra (APA 7 o IEEE; si no piden, IEEE para
  informática). Toda cita en el texto tiene entrada en Referencias y viceversa.
- Código en bloques con lenguaje indicado, breve, y explicado en el texto.
- Siglas desarrolladas la primera vez: "Práctica Profesional Supervisada (PPS)".

## 5. Lista de control antes de entregar

- [ ] Cada sección responde a un propósito declarado en la introducción.
- [ ] Ninguna afirmación técnica contradice el código actual.
- [ ] `scripts/revisar-estilo.mjs` sin marcas sin justificar.
- [ ] Sin viñetas donde corresponde prosa; sin negritas decorativas; sin rayas en exceso.
- [ ] Terminología consistente (mismo término para el mismo concepto en todo el texto).
- [ ] Figuras, tablas y referencias numeradas y citadas.
- [ ] Ortografía y tildes revisadas (incluidas mayúsculas: "Monitores" no va con mayúscula
      en medio de oración).
- [ ] Leído en voz alta: ninguna oración suena a folleto.
