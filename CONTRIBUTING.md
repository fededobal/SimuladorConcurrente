# Cómo se trabaja en este repo

Reglas cortas, con el porqué. Si una regla molesta más de lo que ayuda, se discute y se
cambia acá — no se saltea en silencio.

## 0. Una vez por clon

```bash
sh scripts/instalar-hooks.sh     # activa .githooks/ (valida mensajes y el motor)
cd frontend && npm install
```

## 1. Reglas del repo

El simulador cubre solo monitores (ver `docs/decisiones/0003-alcance-solo-monitores.md`).
Las convenciones de código están en
`.claude/skills/convenciones-codigo/` y valen igual para personas y agentes.

1. **`main` siempre anda.** Lo que está en `main` se publica en Vercel. Si no compila o no
   pasa `npm run check`, no va a `main`.
2. **El motor generado viaja con su fuente.** Si tocás `backend/.../lang`, `vm`, `js` o el
   `pom.xml`, en el mismo commit van `frontend/src/engine/simulador.js` y `simulador.hash`
   (`npm run engine`). El hook te frena si te olvidás.
3. **Nada se edita en `simulador.js` a mano.** Nunca.
4. **Cambio de comportamiento ⇒ test.** JUnit para el núcleo; si el alumno lo ve, además un
   caso en `scripts/smoke-motor.mjs`.
5. **Cambio del lenguaje ⇒ docs.** `docs/referencia_lenguaje.md` y
   `docs/sintaxis_especificacion.md` en el mismo commit o en el siguiente de la misma rama.
6. **Decisiones grandes quedan escritas.** Una página en `docs/decisiones/` (ver plantilla).
   Para la PPS esto vale oro: es la justificación de cada elección.
7. **Todo commit lleva su entrada en `CHANGELOG.md`** con autor y fecha.
8. **Los documentos de la PPS son formales**: verificados contra el código y sin rasgos de
   texto generado (`node scripts/revisar-estilo.mjs <archivo>`).
9. **No se sube basura.** `__MACOSX/`, `.DS_Store`, `target/`, `dist/`, `node_modules/`.

## 2. Commits: la idea de fondo

Un commit es **una unidad de cambio que se puede explicar en una línea y deshacer sola**.
El historial es la bitácora del proyecto: dentro de tres meses (o en la defensa de la PPS)
vas a querer saber *cuándo* y *por qué* cambió algo, y `git log` es lo único que lo sabe.

Hoy el historial tiene 18 commits: 11 dicen `.` y 1 dice `inicial`, y 6 commits concentran el
98 % de las líneas cambiadas (uno toca 98 archivos). Eso hace imposible encontrar cuándo
entró un bug con `git bisect`, o revertir una cosa sin revertir otras diez.

### Formato: prefijo, mensaje y descripción (Conventional Commits, en español)

```
prefijo(alcance): mensaje en imperativo y minúscula, sin punto final

Descripción: por qué se hizo, qué problema resuelve, qué alternativa se
descartó o qué queda pendiente. Líneas de hasta 72 caracteres.
```

El prefijo y el mensaje son obligatorios (el hook rechaza el commit si faltan). La
descripción se escribe siempre que se pueda; el hook avisa si falta. Desde la terminal:
`git commit` abre el editor, o `git commit -m "prefijo: mensaje" -m "Descripción."`.

**Tipos**: `feat` (algo nuevo que el usuario nota) · `fix` (arreglo) · `docs` · `test` ·
`refactor` (mismo comportamiento, otro código) · `perf` · `build` (Maven, npm, TeaVM) ·
`ci` · `chore` (mantenimiento) · `style` (formato) · `revert`.

**Alcances sugeridos**: `lexer`, `parser`, `validador`, `vm`, `puente`, `motor` (el JS
generado), `ui`, `editor`, `api`, `docs`, `repo`.

**Buenos**
```
fix(vm): liberar el monitor cuando un proceso falla adentro
feat(lenguaje): agregar ColaOrdenada con inserción estable
build(motor): regenerar simulador.js
docs(referencia): documentar write()
refactor(parser): extraer parseQueueOp
```

**Malos (y por qué)**
```
.                                     → no dice nada
arreglos                              → ¿qué? ¿dónde?
feat: arranco de cero fix: comentarios → dos cambios en uno: son dos commits
fix: hilo READY ...  (57 archivos)     → un "fix" que esconde una reescritura
```

### El ciclo de todos los días

```bash
git switch -c fix/lock-en-error        # 1. rama por tema
# ... trabajar ...
git status                             # 2. ¿qué cambió?
git diff                               #    ¿es lo que quería?
git add -p                             # 3. agregar de a pedazos (clave para commits chicos)
# editar CHANGELOG.md: una línea en [Sin publicar] con tu nombre y la fecha
git add CHANGELOG.md
git diff --staged                      # 4. revisar lo que va a entrar
git commit                             # 5. prefijo: mensaje + descripción; el hook valida
npm run check                          # 6. antes de integrar
git switch main && git merge --ff-only fix/lock-en-error   # o PR en GitHub
git push
```

`git add -p` es la herramienta que más cambia la calidad del historial: te muestra cada
bloque y preguntás "¿esto va en este commit?" (`y`/`n`/`s` para partirlo).

### CHANGELOG: qué cambió y quién

Cada commit (salvo `style`) agrega una entrada en `CHANGELOG.md`, sección
`[Sin publicar]`, con este formato exacto:

```
- Liberar el monitor cuando un proceso falla dentro de un procedimiento. (Federico Dobal, 2026-09-20)
```

El nombre es el de `git config user.name`: configuralo con tu nombre real una vez
(`git config --global user.name "Federico Dobal"`). El hook rechaza el commit si no hay
entrada nueva con tu nombre. La entrada se escribe para quien usa o mantiene el
simulador, no para quien lee el diff. Secciones y reglas: al principio de `CHANGELOG.md`.

Por qué además del `git log`: el log es para desarrolladores y tiene todo; el CHANGELOG es
la historia legible del producto (qué cambió para alumnos y docentes, quién y cuándo), y
es lo que se muestra a la cátedra o se cita en el informe.

### Tamaño

Regla práctica: si el mensaje necesita un "y", son dos commits. Si el diff no se puede leer
en 5 minutos, probablemente también. Excepción razonable: `build(motor): regenerar
simulador.js` que viene pegado al cambio Java.

### Ramas

- `main`: publicado.
- `feat/…`, `fix/…`, `docs/…`: una por tema, vida corta (días, no semanas).
- Si trabajás solo, PR igual: GitHub corre el CI y te queda el registro de qué se integró.

### Si te equivocás

```bash
git commit --amend                 # corregir el último mensaje (si no pusheaste)
git restore --staged archivo       # sacar algo del staging
git revert <hash>                  # deshacer un commit ya publicado, dejando registro
```

### Con Claude

En Claude Code: `/commit` (o "armá el commit"). La skill mira el diff, propone cómo partirlo
si hace falta, escribe el mensaje y te lo muestra antes de ejecutar nada.
