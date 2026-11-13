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
import { readdirSync, readFileSync } from 'node:fs';

const RAIZ = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const motor = await import(pathToFileURL(join(RAIZ, 'frontend', 'src', 'engine', 'simulador.js')).href);
const estricto = process.argv.includes('--estricto');

/** Corre hasta terminar/deadlock. Nunca lanza: las excepciones del motor se devuelven. */
function correr(code, { seed = 7, pasos = 5000, policy = 'RANDOM' } = {}) {
  let creado;
  try { creado = JSON.parse(motor.crear(code, seed)); }
  catch (e) { return { excepcion: `crear: ${e?.message ?? e}` }; }
  if (creado.error) return { compilacion: creado.error, linea: creado.line };
  let r = { finished: creado.finished, deadlock: creado.deadlock, snapshot: creado.snapshot };
  for (let i = 0; i < pasos && !r.finished && !r.deadlock; i++) {
    try { r = JSON.parse(motor.paso(policy, -1)); }
    catch (e) { return { excepcion: `paso: ${e?.message ?? e}` }; }
  }
  const s = r.snapshot;
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
  ['declaracion con lista de nombres', `
    monitor M { int a, b = 5; int recibido = 0;
      procedure guardar(v: in int) { recibido = v; } }
    process P { text lista, comp; int x, y = 7; M.guardar(x + y); }`,
    (r) => r.finished && r.vars['M.a'] === '0' && r.vars['M.b'] === '5' && r.vars['M.recibido'] === '7'],
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
  ['overflow es error de ejecucion, no excepcion (B3)', `
    monitor M { int x = 9223372036854775807; procedure f() { x = x + 1; } } process A { M.f(); }`,
    (r) => !r.excepcion && r.kinds?.has('ERROR')],
  ['error en la inicializacion del monitor vuelve como error (B5)', `
    monitor M { int x = 0; x = 5 / x; procedure f() { x = 1; } } process A { M.f(); }`,
    (r) => !r.excepcion && (r.compilacion || r.kinds?.has('ERROR'))],
  ['d++ sobre double no trunca (B2)', `
    monitor M { double d = 1.5; procedure f() { d++; } } process A { M.f(); }`,
    (r) => r.vars?.['M.d'] === '2.5'],
  ['literal enorme es error de compilacion (B4)', `
    monitor M { int x = 99999999999999999999; procedure f() { x = 1; } } process A { M.f(); }`,
    (r) => !!r.compilacion?.includes('fuera de rango')],
  ['el log tiene tope en una ejecucion larga (B6)', `
    monitor M { int x = 0; procedure f() { x = x + 1; } }
    process P[i: 1..4] { while (true) { M.f(); } }`,
    (r) => !r.finished && JSON.parse(motor.estado()).log.length <= 2000],
  // Verificacion del 23/09/2026 (docs/verificacion-2026-09-23.md)
  ['double infinito es error de ejecucion y no rompe el puente (VB-2)', `
    process P { for (double x = 1${'0'.repeat(300)}.0 * 10000000000.0; x < 0.0; x++) { skip; } skip; }`,
    (r) => !r.excepcion && r.finished && r.kinds.has('ERROR')],
  ['anidamiento excesivo es error de compilacion (VB-3)', `
    process P { int x = ${'('.repeat(3000)}1${')'.repeat(3000)}; }`,
    (r) => !!r.compilacion?.includes('anidamiento')],
  ['digito no ASCII no es un numero (VB-3)', `
    process P { int x = \u0663; }`,
    (r) => !!r.compilacion?.includes('inesperado')],
  ['tamano negativo es error del proceso, no deadlock (VI-2, VI-3)', `
    process P { int a[-1]; skip; }`,
    (r) => !r.excepcion && r.finished && !r.deadlock && r.kinds.has('ERROR')],
  ['doubles grandes y literales largos se muestran igual que en la JVM (VB-1)', `
    process P { double m = 9223372036854775807.0 * 4.0;
      write(m, " ", -100000000000000000000000.0, " ", 0.1, " ", 0000000000000000000001.25,
            " ", 4503599627370497.5, " ", 123456789.125); }`,
    (r) => r.snapshot?.output?.[0]?.text
      === '3.68934881474191E19 -1.0E23 0.1 1.25 4503599627370498.0 1.23456789125E8'],
  ['modulo con double y comparaciones exactas (VI-7, VI-8)', `
    process P { int a = 9007199254740993; int b = 9007199254740992; write(5.5 % 2, " ", a > b); }`,
    (r) => r.snapshot?.output?.[0]?.text === '1.5 true'],
  ['comparar tipos distintos es error de compilacion (VI-8, D-1)', `
    process P { boolean b = "10" == 10; }`,
    (r) => !!r.compilacion?.includes('No se puede comparar')],
  ['un for no pisa el iterador de la familia (VI-6)', `
    process P[i: 0..1] { for (int i = 0..5) { skip; } }`,
    (r) => !!r.compilacion?.includes('Ya existe')],
  ['llamada abierta: el llamador suelta su monitor (D-5, ADR 0004)', `
    monitor B { boolean listo = false; cond c;
      procedure esperar() { while (not listo) wait(c); } procedure abrir() { listo = true; signal(c); } }
    monitor A { procedure f() { B.esperar(); } procedure g() { B.abrir(); } }
    process P { A.f(); } process Q { skip; skip; A.g(); }`,
    (r) => r.finished && !r.deadlock],
  ['el error de ejecucion llega con el proceso y su linea (VI-1)', `
    monitor M { boolean listo = false; cond c;
      procedure esperar() { while (not listo) wait(c); }
      procedure avisar() { int x = 1 / 0; listo = true; signal(c); } }
    process A { M.esperar(); } process B { skip; skip; M.avisar(); }`,
    (r) => r.deadlock && r.snapshot.processes.some((p) => p.error === 'División por cero' && p.line === 4)],
  ['el snapshot marca quien avanzo (VS-11)', `
    process A { skip; skip; } process B { skip; skip; }`,
    (r) => r.finished && r.snapshot.processes.every((p) => typeof p.advanced === 'boolean')],
  ['el snapshot numera el turno de los que avanzaron', `
    process P[i: 0..4] { skip; skip; skip; }`,
    () => {
      JSON.parse(motor.crear('process P[i: 0..4] { skip; skip; skip; }', 3));
      const ps = JSON.parse(motor.paso('RANDOM', -1)).snapshot.processes;
      const turnos = ps.filter((p) => p.advanced).map((p) => p.advanceOrder).sort((x, y) => x - y);
      return turnos.length > 0 && turnos.every((t, k) => t === k)
        && ps.every((p) => p.advanced === (p.advanceOrder >= 0));
    }],
  ['al salir del monitor entra uno de la cola en el mismo instante (ADR 0005)', `
    monitor M { int x = 0; procedure f() { x = x + 1; } }
    process A { M.f(); } process B { M.f(); } process C { M.f(); }`,
    () => {
      JSON.parse(motor.crear(`monitor M { int x = 0; procedure f() { x = x + 1; } }
        process A { M.f(); } process B { M.f(); } process C { M.f(); }`, 0));
      motor.paso('ROUND_ROBIN', -1);
      motor.paso('ROUND_ROBIN', -1);
      const r = JSON.parse(motor.paso('ROUND_ROBIN', -1));
      const kinds = r.entries.map((e) => `${e.kind}:${e.processId}`);
      const m = r.snapshot.monitors[0];
      const dueno = m.lockOwner?.id;
      const entro = r.snapshot.processes[dueno - 1];
      return (dueno === 2 || dueno === 3) && kinds.includes('RETURN:1')
        && kinds.indexOf(`ENTER:${dueno}`) > kinds.indexOf('RETURN:1') && entro.advanced
        && m.entryQueue.map((p) => p.id).join() === String(5 - dueno);
    }],
  ['la entrada al monitor no respeta el orden de llegada (ADR 0006)', `
    monitor M { int x = 0; procedure f() { x = x + 1; } }
    process A { M.f(); } process B { M.f(); } process C { M.f(); }`,
    () => {
      const entraron = new Set();
      for (let k = 0; k < 25; k++) {
        JSON.parse(motor.crear(`monitor M { int x = 0; procedure f() { x = x + 1; } }
          process A { M.f(); } process B { M.f(); } process C { M.f(); }`, 1763000000000 + k * 7919));
        motor.paso('ROUND_ROBIN', -1);
        motor.paso('ROUND_ROBIN', -1);
        entraron.add(JSON.parse(motor.paso('ROUND_ROBIN', -1)).snapshot.monitors[0].lockOwner?.id);
      }
      return entraron.has(2) && entraron.has(3);
    }],
  ['indice mayor que un int no se trunca (VI-4)', `
    process P { int a[3]; int r; r = a[4294967296]; }`,
    (r) => r.finished && r.kinds.has('ERROR')],
];

// Bugs verificados el 18/09/2026 (ver docs/informe-revision.md, seccion 3).
const CONOCIDOS = [
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
// Los ejemplos de la interfaz: la segunda linea declara lo esperado
// ("// espera: fin M.x=1 ..." o "// espera: deadlock"), igual que en EjemplosTest.
console.log('Ejemplos');
const DIR_EJEMPLOS = join(RAIZ, 'ejemplos');
for (const archivo of readdirSync(DIR_EJEMPLOS).filter((f) => f.endsWith('.mon')).sort()) {
  const code = readFileSync(join(DIR_EJEMPLOS, archivo), 'utf8');
  const [tipo, ...vars] = (code.split('\n')[1] ?? '').replace(/^\/\/\s*espera:\s*/, '').trim().split(/\s+/);
  const r = correr(code);
  const bien = tipo === 'deadlock'
    ? r.deadlock
    : tipo === 'fin' && r.finished && !r.kinds.has('ERROR')
      && vars.every((v) => { const [mv, val] = v.split('='); return r.vars[mv] === val; });
  if (!bien) fallas++;
  console.log(`  ${bien ? 'OK   ' : 'FALLA'} ${archivo}${bien ? '' : '  -> ' + mostrar(r)}`);
}

// Paridad del azar (VB-1): misma semilla, mismo entrelazado que la JVM. La traza es la de
// AzarTest#trazaDelEjemploDeExclusionConSemillaFija; si una cambia, tiene que cambiar la otra.
console.log('Paridad con la JVM');
{
  const TRAZA = '4E 1B 2B | 4A 3B | 4A | 4A | 4A | 4R 3E |';
  motor.crear(readFileSync(join(DIR_EJEMPLOS, '02-exclusion-mutua.mon'), 'utf8'), 0);
  let traza = '';
  for (let i = 0; i < 6; i++) {
    for (const e of JSON.parse(motor.paso('RANDOM', -1)).entries) traza += `${e.processId}${e.kind[0]} `;
    traza += '| ';
  }
  const bien = traza.trim() === TRAZA;
  if (!bien) fallas++;
  console.log(`  ${bien ? 'OK   ' : 'FALLA'} azar con semilla 0 igual que en la JVM${bien ? '' : '  -> ' + traza.trim()}`);
}

console.log('Bugs conocidos (se esperan en FALLA hasta arreglarlos)');
for (const [nombre, code, ok] of CONOCIDOS) {
  const r = correr(code);
  const bien = !!ok(r);
  if (!bien && estricto) fallas++;
  console.log(`  ${bien ? 'ARREGLADO (movelo a CANONICOS)' : 'pendiente'} ${nombre}${bien ? '' : '  -> ' + mostrar(r)}`);
}
process.exit(fallas ? 1 : 0);
