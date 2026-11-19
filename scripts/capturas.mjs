#!/usr/bin/env node
// Regenera las capturas de la guia (docs/public/capturas) con el simulador real.
//
//   1. Levantar el simulador:  ./dev.sh        (o: cd frontend && npx vite --port 5173)
//   2. node scripts/capturas.mjs               todas
//      node scripts/capturas.mjs barra editor  solo esas
//
// Variables: URL (por defecto http://localhost:5173) y CHROME (ruta de un Chrome o Chromium;
// por defecto, el que descarga Playwright en ~/Library/Caches/ms-playwright).
//
// Cada captura abre un programa por enlace, con semilla y turnos fijos, y da una cantidad de
// pasos: como la ejecucion es determinista, la imagen sale igual cada vez. Se sacan en tema
// claro y a doble densidad.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DESTINO = join(RAIZ, 'docs', 'public', 'capturas');
const URL_BASE = process.env.URL ?? 'http://localhost:5173';

function chrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const cache = join(homedir(), 'Library', 'Caches', 'ms-playwright');
  const dir = existsSync(cache) ? readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().pop() : undefined;
  if (!dir) throw new Error('No se encontró Chromium: indicá la ruta con CHROME=...');
  return join(cache, dir, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing');
}

/** Un ejemplo del menu, sin la linea "// espera:" (como lo muestra el editor). */
function ejemplo(archivo) {
  return readFileSync(join(RAIZ, 'ejemplos', archivo), 'utf8').replace(/^\/\/\s*espera:.*\n/m, '');
}

/** Fragmento de un enlace para compartir (igual a frontend/src/shareLink.ts). */
function enlace({ nombre, codigo, semilla, turnos = 'azar' }) {
  const base64 = Buffer.from(codigo, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `#${new URLSearchParams({ nombre, semilla: String(semilla), turnos })}&codigo=${base64}`;
}

const BANCO = { nombre: 'Problema completo: banco y escritorios', codigo: ejemplo('21-banco.mon'), semilla: 48213, turnos: 'ronda' };
const CAJERO = { nombre: 'Exclusión mutua implícita', codigo: ejemplo('01-exclusion-mutua.mon'), semilla: 48213 };
const BUFFER = { nombre: 'Variables condición: wait y signal', codigo: ejemplo('04-variables-condicion.mon'), semilla: 48213 };

const IMPRESORA = `monitor Impresora {
  bool libre = true;
  cond turno;

  procedure pedir() {
    while (not libre) wait(turno);
    libre = false;
  }

  procedure soltar() {
    libre = true;
    signal(turno);
  }

  procedure mantener() {
    delay(40);
  }
}

process Oficina[i: 1..4] {
  Impresora.pedir();
  delay(30);
  Impresora.soltar();
}

process Tecnico {
  skip;
  Impresora.mantener();
}

process Contador[i: 1..2] {
  int n = 0;
  while (n < 50) { n++; }
}
`;

const DOS_MONITORES = `monitor A {
  procedure usar() { B.esperar(); }
  procedure avisar() { B.despertar(); }
}

monitor B {
  cond c;
  procedure esperar() { wait(c); }
  procedure despertar() { signal(c); }
}

process P {
  A.usar();
}

process Q {
  skip;
  skip;
  A.avisar();
}
`;

const FUERA_DE_RANGO = `monitor Registro {
  int cuenta[3];

  procedure anotar(i: in int) {
    cuenta[i] = cuenta[i] + 1;
  }
}

process Trabajador[i: 1..3] {
  Registro.anotar(i);
}
`;

const SIN_PUNTO_Y_COMA = BUFFER.codigo.replace('dato = D;', 'dato = D');

/**
 * Las capturas. `pasos`: veces que se da Paso; `antes`: codigo que corre en la pagina antes
 * de sacar la imagen (elegir una pestana, abrir un menu); `recorte`: selector del elemento
 * que se captura (sin el, la ventana entera).
 */
const CAPTURAS = {
  pantalla: { programa: BANCO, pasos: 14, numeros: true },
  barra: { programa: BUFFER, pasos: 14, recorte: 'header' },
  'primer-programa': { programa: CAJERO, pasos: 7 },
  'editor-estados': { programa: { nombre: 'Impresora compartida', codigo: IMPRESORA, semilla: 7 }, pasos: 9, recorte: 'section[aria-label="Editor"]', alto: 1180 },
  'editor-error': { programa: { nombre: BUFFER.nombre, codigo: SIN_PUNTO_Y_COMA, semilla: 48213 }, pasos: 1, recorte: 'section[aria-label="Editor"]', alto: 700 },
  'editor-error-ejecucion': { programa: { nombre: 'Registro', codigo: FUERA_DE_RANGO, semilla: 48213, turnos: 'ronda' }, pasos: 30, recorte: 'section[aria-label="Editor"]', alto: 600 },
  monitores: { programa: BANCO, pasos: 14, recorte: 'aside[aria-label="Inspector"]', alto: 1000 },
  procesos: { programa: BANCO, pasos: 14, antes: "document.getElementById('tab-processes').click()", recorte: 'aside[aria-label="Inspector"]' },
  salida: { programa: CAJERO, pasos: 200, antes: "document.getElementById('tab-output').click()", recorte: 'aside[aria-label="Inspector"]', alto: 620 },
  'linea-de-tiempo': {
    programa: BANCO, pasos: 22, recorte: 'section[aria-label="Línea de tiempo"]',
    // clic en el instante 10: el cartel aparece al lado del puntero
    antes: `(() => { const p = document.querySelector('section[aria-label="Línea de tiempo"] [class*="plane"]'); const r = p.getBoundingClientRect();
      const nombres = Number(document.querySelector('[aria-label="Cambiar el ancho de la columna de nombres"]').getAttribute('aria-valuenow'));
      p.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + nombres + 9.5 * 26, clientY: r.top + 150 })); })()`,
  },
  'selector-de-monitores': {
    programa: BANCO, pasos: 14, recorte: 'aside[aria-label="Inspector"]', alto: 900,
    // el vector Escritorio arriba de todo, con su selector abierto
    antes: `(() => { const v = document.querySelector('section[aria-label^="Vector de monitores"]');
      v.scrollIntoView({ block: 'start' }); v.querySelector('button[aria-haspopup]').click(); })()`,
  },
  deadlock: { programa: { nombre: 'Dos monitores', codigo: DOS_MONITORES, semilla: 48213, turnos: 'ronda' }, pasos: 6 },
  constantes: {
    programa: CAJERO, pasos: 0, recorte: 'section[aria-label="Editor"]', alto: 560,
    antes: `[...document.querySelectorAll('section[aria-label="Editor"] button')].find((b) => b.textContent.includes('Constantes')).click()`,
  },
  programas: { programa: CAJERO, pasos: 0, antes: `document.querySelector('button[aria-label^="Programa:"]').click()`, alto: 640, ancho: 760 },
};

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function conectar(puerto) {
  for (let i = 0; i < 60; i++) {
    try {
      const paginas = await (await fetch(`http://127.0.0.1:${puerto}/json`)).json();
      const pagina = paginas.find((t) => t.type === 'page');
      if (pagina) return new WebSocket(pagina.webSocketDebuggerUrl);
    } catch { /* todavia no levanto */ }
    await esperar(100);
  }
  throw new Error('Chromium no levantó');
}

async function capturar(nombre, { programa, pasos, antes, recorte, numeros, ancho = 1280, alto = 780 }) {
  const puerto = 9300 + Math.floor(Math.random() * 500);
  const navegador = spawn(chrome(), [
    '--headless=new', `--remote-debugging-port=${puerto}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'capturas-'))}`,
    '--hide-scrollbars', 'about:blank',
  ], { stdio: 'ignore' });
  try {
    const ws = await conectar(puerto);
    await new Promise((r) => ws.addEventListener('open', r));
    let id = 0;
    const pendientes = new Map();
    ws.addEventListener('message', (m) => {
      const d = JSON.parse(m.data);
      if (d.id && pendientes.has(d.id)) { pendientes.get(d.id)(d); pendientes.delete(d.id); }
    });
    const cdp = (method, params = {}) => new Promise((r) => {
      const n = ++id; pendientes.set(n, r); ws.send(JSON.stringify({ id: n, method, params }));
    });
    const evaluar = async (expression) => (await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;

    await cdp('Page.enable');
    await cdp('Emulation.setDeviceMetricsOverride', { width: ancho, height: alto, deviceScaleFactor: 2, mobile: false });
    await cdp('Page.addScriptToEvaluateOnNewDocument', {
      source: "try { localStorage.setItem('vitepress-theme-appearance', 'light'); } catch (e) {}",
    });
    await cdp('Page.navigate', { url: `${URL_BASE}/${enlace(programa)}` });
    await esperar(1500);
    for (let i = 0; i < pasos; i++) {
      // un Paso de mas despues del fin volveria a empezar, con otra semilla
      const estado = await evaluar("document.querySelector('header [role=status]').textContent");
      if (/Terminó|Deadlock|Fin con errores|Error/.test(estado)) break;
      await evaluar("[...document.querySelectorAll('header button')].find((b) => b.textContent.trim().startsWith('Paso')).click()");
      await esperar(60);
    }
    if (antes) await evaluar(antes);
    // sin el aviso de "se abrio desde un enlace" y con el deslizamiento de los chips terminado
    await esperar(4300);
    if (numeros) await evaluar(NUMERAR);

    let clip;
    if (recorte) {
      const r = await evaluar(`(() => { const r = document.querySelector(${JSON.stringify(recorte)}).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`);
      clip = { ...r, scale: 1 };
    }
    const imagen = await cdp('Page.captureScreenshot', { format: 'png', ...(clip && { clip }) });
    writeFileSync(join(DESTINO, `${nombre}.png`), Buffer.from(imagen.result.data, 'base64'));
    console.log(`  ${nombre}.png`);
    ws.close();
  } finally {
    navegador.kill();
  }
}

/**
 * Dibuja un numero sobre cada zona de la pantalla, en el orden de la tabla de la guia. Cada
 * zona indica donde va su numero (fraccion del ancho y px desde arriba), en un lugar vacio.
 */
const NUMERAR = `(() => {
  const zonas = [['header', 0.66, 23], ['section[aria-label="Editor"]', 0.8, 150],
    ['aside[aria-label="Inspector"]', 0.88, 150], ['section[aria-label="Línea de tiempo"]', 0.7, 120],
    ['footer', 0.62, 13]];
  zonas.forEach(([selector, fx, dy], i) => {
    const r = document.querySelector(selector).getBoundingClientRect();
    const n = document.createElement('div');
    n.textContent = String(i + 1);
    n.style.cssText = 'position:fixed;z-index:99;width:28px;height:28px;border-radius:50%;background:#c0352b;color:#fff;'
      + 'font:700 15px system-ui;display:flex;align-items:center;justify-content:center;border:2px solid #fff;'
      + 'box-shadow:0 2px 8px rgba(0,0,0,.3);left:' + (r.left + r.width * fx - 14) + 'px;top:' + (r.top + dy - 14) + 'px';
    document.body.appendChild(n);
  });
})()`;

const pedidas = process.argv.slice(2);
const nombres = pedidas.length > 0 ? pedidas : Object.keys(CAPTURAS);
console.log(`Capturas desde ${URL_BASE}:`);
for (const nombre of nombres) {
  if (!CAPTURAS[nombre]) { console.error(`  no existe la captura "${nombre}"`); process.exitCode = 1; continue; }
  await capturar(nombre, CAPTURAS[nombre]);
}
