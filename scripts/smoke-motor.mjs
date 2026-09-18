#!/usr/bin/env node
// Prueba de humo del motor COMPILADO (frontend/src/engine/simulador.js), no del Java.
// Valida lo que realmente corre en el navegador de los alumnos: si TeaVM traduce mal algo,
// los tests de JUnit pasan igual y esto lo detecta.
//
//   node scripts/smoke-motor.mjs              canonicos deben pasar; bugs conocidos se informan
//   node scripts/smoke-motor.mjs --estricto   los bugs conocidos tambien hacen fallar
//
// Cuando arregles un bug conocido, movelo de CONOCIDOS a CANONICOS.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RAIZ = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const motor = await import(pathToFileURL(join(RAIZ, 'frontend', 'src', 'engine', 'simulador.js')).href);
const estricto = process.argv.includes('--estricto');

/** Corre hasta terminar/deadlock. Nunca lanza: las excepciones del motor se devuelven. */
function correr(code, { seed = 7, pasos = 5000, policy = 'RANDOM' } = {}) {
  let creado;
  try { creado = JSON.parse(motor.crear(code, seed)); }
  catch (e) { return { excepcion: `crear: ${e?.message ?? e}` }; }
  if (creado.error) return { compilacion: creado.error, linea: creado.line };
  let r = { finished: creado.finished, deadlock: creado.deadlock, entries: [creado.initial] };
  let ultimo = creado.initial;
  for (let i = 0; i < pasos && !r.finished && !r.deadlock; i++) {
    try { r = JSON.parse(motor.paso(policy, -1)); }
    catch (e) { return { excepcion: `paso: ${e?.message ?? e}` }; }
    if (r.entries.length) ultimo = r.entries.at(-1);
  }
  const s = ultimo.snapshot;
  const kinds = new Set(JSON.parse(motor.estado()).log.map((l) => l.kind));
  const vars = {};
  for (const m of s.monitors) for (const v of m.vars) vars[`${m.name}.${v.name}`] = v.value;
  return { finished: r.finished, deadlock: r.deadlock, vars, kinds, snapshot: s };
}

const CANONICOS = [
  ['exclusion mutua implicita', `
    monitor Cuenta { int x = 0; int dentro = 0; int maxDentro = 0;
      procedure sumar() { dentro = dentro + 1; if (dentro > maxDentro) maxDentro = dentro;
                          x = x + 1; dentro = dentro - 1; } }
    process P[i: 0..3] { Cuenta.sumar(); }`,
    (r) => r.finished && r.vars['Cuenta.x'] === '4' && r.vars['Cuenta.maxDentro'] === '1'],
  ['buffer de un dato (signal and continue)', `
    monitor Buf { int dato = 0; boolean hay = false; int suma = 0; cond p; cond c;
      procedure enviar(d: in int) { while (hay) wait(p); dato = d; hay = true; signal(c); }
      procedure recibir() { while (not hay) wait(c); suma = suma + dato; hay = false; signal(p); } }
    process Prod { for (int i = 1..5) { Buf.enviar(i); } }
    process Cons { for (int k = 1..5) { Buf.recibir(); } }`,
    (r) => r.finished && r.vars['Buf.suma'] === '15'],
  ['signal_all despierta a todos', `
    monitor Gate { boolean open = false; int through = 0; cond g;
      procedure esperar() { while (not open) wait(g); through = through + 1; }
      procedure abrir() { open = true; signal_all(g); } }
    process W[i: 0..4] { Gate.esperar(); }
    process Opener { Gate.abrir(); }`,
    (r) => r.finished && r.vars['Gate.through'] === '5'],
  ['deadlock real se detecta', `
    monitor M { cond c; procedure bloquear() { wait(c); } }
    process P { M.bloquear(); }`,
    (r) => r.deadlock && r.kinds.has('DEADLOCK')],
  ['error de compilacion trae linea', `
    monitor M { procedure f() { x = 1; } }
    process P { M.f(); }`,
    (r) => r.compilacion && r.linea === 2],
  ['ColaOrdenada respeta prioridad', `
    monitor M { ColaOrdenada c; int primero = 0;
      procedure cargar() { push(c, 3); push(c, 1); push(c, 2); }
      procedure sacar() { pop(c, primero); } }
    process P { M.cargar(); M.sacar(); }`,
    (r) => r.finished && r.vars['M.primero'] === '1'],
  ['error dentro del monitor libera el lock (B1)', `
    monitor M { int x = 0; procedure f() { x = 10 / x; } procedure g() { x = x + 1; } }
    process A { M.f(); } process B { M.g(); }`,
    (r) => r.finished && !r.deadlock && r.vars['M.x'] === '1' && r.kinds.has('ERROR')],
];

// Bugs verificados el 18/09/2026 (ver docs/informe-revision.md, seccion 3).
const CONOCIDOS = [
  ['B2 d++ sobre double no trunca', `
    monitor M { double d = 1.5; procedure f() { d++; } } process A { M.f(); }`,
    (r) => r.vars?.['M.d'] === '2.5'],
  ['B3 overflow es error de ejecucion, no excepcion', `
    monitor M { int x = 9223372036854775807; procedure f() { x = x + 1; } } process A { M.f(); }`,
    (r) => !r.excepcion && r.kinds?.has('ERROR')],
  ['B4 literal enorme es error de compilacion', `
    monitor M { int x = 99999999999999999999; procedure f() { x = 1; } } process A { M.f(); }`,
    (r) => !!r.compilacion],
  ['B5 error en la inicializacion del monitor vuelve como error', `
    monitor M { int x = 0; x = 5 / x; procedure f() { x = 1; } } process A { M.f(); }`,
    (r) => !r.excepcion && (r.compilacion || r.kinds?.has('ERROR'))],
];

let fallas = 0;
const mostrar = (r) => r.excepcion ?? r.compilacion ?? JSON.stringify({ finished: r.finished, deadlock: r.deadlock, vars: r.vars });
console.log('Canonicos');
for (const [nombre, code, ok] of CANONICOS) {
  const r = correr(code);
  const bien = !!ok(r);
  if (!bien) fallas++;
  console.log(`  ${bien ? 'OK   ' : 'FALLA'} ${nombre}${bien ? '' : '  -> ' + mostrar(r)}`);
}
console.log('Bugs conocidos (se esperan en FALLA hasta arreglarlos)');
for (const [nombre, code, ok] of CONOCIDOS) {
  const r = correr(code);
  const bien = !!ok(r);
  if (!bien && estricto) fallas++;
  console.log(`  ${bien ? 'ARREGLADO (movelo a CANONICOS)' : 'pendiente'} ${nombre}${bien ? '' : '  -> ' + mostrar(r)}`);
}
process.exit(fallas ? 1 : 0);
