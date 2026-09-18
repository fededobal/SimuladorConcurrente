#!/usr/bin/env node
// Huella del nucleo Java que se compila a frontend/src/engine/simulador.js.
//
//   node scripts/motor-hash.mjs --write   guarda la huella (lo corre `npm run engine`)
//   node scripts/motor-hash.mjs --check   falla si el nucleo cambio y el motor no se regenero
//
// Por que existe: simulador.js es codigo generado y commiteado. Si alguien toca lang/ o vm/
// y se olvida de regenerarlo, el deploy publica un motor viejo y nadie se entera.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const BASE = join(RAIZ, 'backend', 'src', 'main', 'java', 'ar', 'edu', 'unlp', 'info', 'simulador');
// Lo que alcanza TeaVM desde el puente js/.
const FUENTES = ['lang', 'vm', 'js'].map((d) => join(BASE, d));
const EXTRA = [join(RAIZ, 'backend', 'pom.xml')];
const SELLO = join(RAIZ, 'frontend', 'src', 'engine', 'simulador.hash');

function archivos(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? archivos(p) : p.endsWith('.java') ? [p] : [];
  });
}

function huella() {
  const h = createHash('sha256');
  const todos = [...FUENTES.flatMap(archivos), ...EXTRA.filter(existsSync)].sort();
  for (const f of todos) {
    // ruta relativa con '/' para que Mac, Linux y Windows den la misma huella
    h.update(relative(RAIZ, f).split(sep).join('/'));
    h.update('\0');
    h.update(readFileSync(f, 'utf8').replace(/\r\n/g, '\n'));
    h.update('\0');
  }
  return h.digest('hex');
}

const modo = process.argv[2];
const actual = huella();
if (modo === '--write') {
  writeFileSync(SELLO, actual + '\n');
  console.log('motor-hash: sello actualizado');
} else if (modo === '--check') {
  const guardado = existsSync(SELLO) ? readFileSync(SELLO, 'utf8').trim() : '(sin sello)';
  if (guardado !== actual) {
    console.error('motor-hash: el nucleo Java cambio pero frontend/src/engine/simulador.js no se regenero.');
    console.error('  Corre:  cd frontend && npm run engine   y commitea simulador.js + simulador.hash');
    process.exit(1);
  }
  console.log('motor-hash: motor al dia con el nucleo');
} else {
  console.log(actual);
}
