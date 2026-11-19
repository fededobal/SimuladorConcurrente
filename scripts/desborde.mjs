#!/usr/bin/env node
// Control de desborde visual: abre el simulador real con programas exigentes (nombres largos,
// vectores de monitores, colas y arreglos con muchos elementos, deadlock) en varios anchos de
// ventana y de panel, y lista cada elemento cuyo contenido se corta o se sale de su lugar.
//
//   1. Levantar el simulador:  ./dev.sh        (o: cd frontend && npx vite --port 5173)
//   2. node scripts/desborde.mjs                    todos los escenarios
//      node scripts/desborde.mjs banco angosto      solo los que contienen esas palabras
//      node scripts/desborde.mjs --capturas <dir>   ademas guarda una imagen de cada uno
//
// Variables: URL (por defecto http://localhost:5173), CHROME (ruta de un Chrome o Chromium;
// por defecto, el que descarga Playwright en ~/Library/Caches/ms-playwright), ALTO (alto de
// la ventana, 780 por defecto) y RECORTE (selector del elemento que se guarda en la captura).
//
// Termina con codigo 1 si encuentra algo. Que se considera desborde esta en DETECTAR.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(fileURLToPath(new URL('.', import.meta.url)), '..');
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

// --- programas ---

const BANCO = { nombre: 'Problema completo: banco y escritorios', codigo: ejemplo('21-banco.mon'), semilla: 48213, turnos: 'ronda' };

const DEADLOCK = { nombre: 'Deadlock', codigo: ejemplo('20-deadlock.mon'), semilla: 48213, turnos: 'ronda' };

/** El banco con muchos clientes: colas de entrada largas y una cola de enteros que crece. */
const BANCO_GRANDE = { ...BANCO, nombre: 'Banco con 40 clientes', codigo: BANCO.codigo.replace('#define N 6', '#define N 40') };

/** Nombres largos en todo: monitores, procesos, variables condicion, variables y textos. */
const NOMBRES_LARGOS = {
  nombre: 'Administración de recursos compartidos con nombres muy largos para probar el desborde',
  semilla: 7,
  codigo: `#define CANTIDAD 14

monitor AdministradorDeRecursosCompartidos[id: 0..11] {
  cond esperaDeLosClientesPreferenciales[CANTIDAD];
  cond esperaDelAdministradorGeneral;
  ColaOrdenada pedidosPendientesOrdenadosPorPrioridad(int, text);
  Cola historialDeAtencionesRealizadas(int, text);
  int cantidadDeRecursosDisponibles = 0, contadorDeAtenciones[CANTIDAD];
  text ultimoMensajeRecibidoPorElAdministrador = "todavía no llegó ningún mensaje al administrador";

  procedure solicitarRecursoConPrioridad(idCliente: in int; descripcion: in text) {
    push(pedidosPendientesOrdenadosPorPrioridad, (idCliente, descripcion));
    push(historialDeAtencionesRealizadas, (idCliente, descripcion));
    contadorDeAtenciones[idCliente] = contadorDeAtenciones[idCliente] + 1000000;
    ultimoMensajeRecibidoPorElAdministrador = descripcion;
    wait(esperaDeLosClientesPreferenciales[idCliente]);
  }
}

process ClientePreferencialDelBancoCentral[id: 0..CANTIDAD-1] {
  text descripcionDelPedidoQueSeLeHaceAlAdministrador;
  descripcionDelPedidoQueSeLeHaceAlAdministrador = "pedido urgente y muy detallado del cliente preferencial número " + id;
  AdministradorDeRecursosCompartidos[id mod 2].solicitarRecursoConPrioridad(id, descripcionDelPedidoQueSeLeHaceAlAdministrador);
}
`,
};

/** Muchos procesos y un arreglo grande en un solo monitor. */
const MUCHOS = {
  nombre: 'Muchos procesos',
  semilla: 3,
  codigo: `#define N 60

monitor Deposito {
  int cajas[N];
  Cola pendientes(int);
  cond turno[N];
  cond lleno;
  int total = 0;

  procedure dejar(i: in int) {
    cajas[i] = i * 1000;
    push(pendientes, i);
    total = total + 1;
    if (i mod 2 == 0) wait(turno[i]);
    else wait(lleno);
  }
}

process Repartidor[id: 0..N-1] {
  int vueltas = 0;
  Deposito.dejar(id);
}
`,
};

// --- escenarios ---

const TAB = (id) => `document.getElementById('tab-${id}').click()`;
/** Achica o agranda un panel con las flechas sobre su asa (cada flecha son 24 px). */
const ASA = (rotulo, tecla, veces) => `(async () => {
  const asa = document.querySelector('[role="separator"][aria-label="${rotulo}"]');
  for (let i = 0; i < ${veces}; i++) {
    asa.dispatchEvent(new KeyboardEvent('keydown', { key: '${tecla}', bubbles: true }));
    // cada flecha parte del ancho ya dibujado
    await new Promise((r) => setTimeout(r, 30));
  }
})()`;
const INSPECTOR_MINIMO = ASA('Cambiar el ancho del inspector', 'ArrowRight', 6);
const NOMBRES_ANCHOS = ASA('Cambiar el ancho de la columna de nombres', 'ArrowRight', 30);
const NOMBRES_ANGOSTOS = ASA('Cambiar el ancho de la columna de nombres', 'ArrowLeft', 30);
const AMPLIAR_LINEA = `document.querySelector('button[aria-label="Ampliar la línea de tiempo"]').click()`;
const ENSANCHAR_INSPECTOR = `document.querySelector('button[aria-label="Ensanchar el panel"]').click()`;
/** Abre todos los "+n más" y "ver más" del inspector. */
const ABRIR_TODO = `[...document.querySelectorAll('aside[aria-label="Inspector"] button[aria-expanded="false"]')]
  .filter((b) => !b.hasAttribute('aria-haspopup')).forEach((b) => b.click())`;
/** Abre un menu de la barra o del encabezado del editor. */
const MENU_PASO = `document.querySelector('button[aria-label="Avanzar un proceso elegido"]').click()`;
const MENU_PROGRAMA = `document.querySelector('button[aria-label^="Programa:"]').click()`;
const MENU_CONSTANTES = `[...document.querySelectorAll('section[aria-label="Editor"] button')].find((b) => b.textContent.includes('Constantes')).click()`;
/** Abre el selector del primer vector de monitores, y elige una de sus opciones. */
const ABRIR_SELECTOR = `document.querySelector('section[aria-label^="Vector de monitores"] button[aria-haspopup]').click()`;
const ELEGIR = (texto) => `[...document.querySelectorAll('[role="menuitemradio"]')].find((b) => b.textContent.includes('${texto}')).click()`;
/**
 * Clic en un instante de la linea de tiempo, para ver su cartel, y despues se lleva el
 * puntero a ese lugar de la grilla (fracciones de su parte visible): el cartel lo sigue.
 */
const CLIC_INSTANTE = (fx = 0.5, fy = 0.4) => `(() => {
  const p = document.querySelector('section[aria-label="Línea de tiempo"] [class*="plane"]');
  const v = p.parentElement.getBoundingClientRect();
  const en = (x, y) => ({ bubbles: true, clientX: v.left + v.width * x, clientY: v.top + v.height * y });
  p.dispatchEvent(new MouseEvent('click', en(0.5, 0.4)));
  p.dispatchEvent(new MouseEvent('mousemove', en(${fx}, ${fy})));
})()`;

const ESCENARIOS = [
  { nombre: 'banco', programa: BANCO, pasos: 14 },
  { nombre: 'banco selector abierto', programa: BANCO, pasos: 14, antes: [ABRIR_SELECTOR] },
  { nombre: 'banco un escritorio', programa: BANCO, pasos: 14, antes: [ABRIR_SELECTOR, ELEGIR('Escritorio[1]')] },
  { nombre: 'banco procesos', programa: BANCO, pasos: 14, antes: [TAB('processes')] },
  { nombre: 'banco salida', programa: BANCO, pasos: 200, antes: [TAB('output')] },
  { nombre: 'banco inspector angosto', programa: BANCO, pasos: 14, antes: [INSPECTOR_MINIMO] },
  { nombre: 'banco inspector ancho', programa: BANCO, pasos: 14, antes: [ENSANCHAR_INSPECTOR] },
  { nombre: 'banco linea ampliada', programa: BANCO, pasos: 30, antes: [AMPLIAR_LINEA, CLIC_INSTANTE()] },
  { nombre: 'banco cartel en la esquina', programa: BANCO, pasos: 30, antes: [CLIC_INSTANTE(0.99, 0.98)] },
  { nombre: 'banco nombres angostos', programa: BANCO, pasos: 30, antes: [NOMBRES_ANGOSTOS] },
  { nombre: 'banco ventana chica', programa: BANCO, pasos: 14, ancho: 1024, alto: 640, antes: [CLIC_INSTANTE()] },
  { nombre: 'banco ventana angosta', programa: BANCO, pasos: 14, ancho: 700, alto: 900 },
  { nombre: 'deadlock', programa: DEADLOCK, pasos: 60 },
  { nombre: 'deadlock inspector angosto', programa: DEADLOCK, pasos: 60, antes: [INSPECTOR_MINIMO] },
  { nombre: 'deadlock inspector ancho', programa: DEADLOCK, pasos: 60, antes: [ENSANCHAR_INSPECTOR] },
  { nombre: 'banco grande', programa: BANCO_GRANDE, pasos: 40 },
  { nombre: 'banco grande todo abierto', programa: BANCO_GRANDE, pasos: 40, antes: [ABRIR_TODO] },
  { nombre: 'banco grande procesos angosto', programa: BANCO_GRANDE, pasos: 40, antes: [TAB('processes'), INSPECTOR_MINIMO] },
  { nombre: 'nombres largos', programa: NOMBRES_LARGOS, pasos: 60 },
  { nombre: 'nombres largos todo abierto', programa: NOMBRES_LARGOS, pasos: 60, antes: [ABRIR_TODO] },
  { nombre: 'nombres largos selector abierto', programa: NOMBRES_LARGOS, pasos: 60, antes: [INSPECTOR_MINIMO, ABRIR_SELECTOR] },
  { nombre: 'nombres largos inspector angosto', programa: NOMBRES_LARGOS, pasos: 60, antes: [INSPECTOR_MINIMO, ABRIR_TODO] },
  { nombre: 'nombres largos procesos', programa: NOMBRES_LARGOS, pasos: 60, antes: [TAB('processes'), INSPECTOR_MINIMO] },
  { nombre: 'nombres largos linea ampliada', programa: NOMBRES_LARGOS, pasos: 60, antes: [AMPLIAR_LINEA, CLIC_INSTANTE(0.9, 0.9)] },
  { nombre: 'nombres largos menu paso', programa: NOMBRES_LARGOS, pasos: 3, antes: [MENU_PASO] },
  { nombre: 'nombres largos menu paso ventana angosta', programa: NOMBRES_LARGOS, pasos: 3, ancho: 700, alto: 900, antes: [MENU_PASO] },
  { nombre: 'nombres largos menu programa ventana angosta', programa: NOMBRES_LARGOS, pasos: 0, ancho: 700, alto: 900, antes: [MENU_PROGRAMA] },
  { nombre: 'nombres largos menu constantes linea ampliada', programa: NOMBRES_LARGOS, pasos: 0, antes: [AMPLIAR_LINEA, MENU_CONSTANTES] },
  { nombre: 'nombres largos nombres anchos', programa: NOMBRES_LARGOS, pasos: 60, antes: [NOMBRES_ANCHOS, CLIC_INSTANTE()] },
  { nombre: 'nombres largos ventana angosta', programa: NOMBRES_LARGOS, pasos: 60, ancho: 700, alto: 900 },
  { nombre: 'muchos', programa: MUCHOS, pasos: 80 },
  { nombre: 'muchos todo abierto angosto', programa: MUCHOS, pasos: 80, antes: [INSPECTOR_MINIMO, ABRIR_TODO] },
  { nombre: 'muchos procesos', programa: MUCHOS, pasos: 80, antes: [TAB('processes')] },
];

/**
 * Corre en la pagina y devuelve los desbordes. Se informa un elemento visible cuando:
 *  - su contenido es mas ancho o mas alto que el y lo recorta (overflow hidden), salvo que
 *    el contenido completo este en un `title`, propio o de un antepasado;
 *  - su contenido se sale de el sin recortarse (overflow visible) y pisa lo de al lado;
 *  - queda cortado por la izquierda de un contenedor, donde no se llega ni desplazando;
 *  - un panel que no es la linea de tiempo ni el editor se desplaza de costado;
 *  - se sale de la ventana.
 */
const DETECTAR = `(() => {
  const hallazgos = [];
  const vistos = new Set();
  const nombre = (el) => {
    const clases = [...el.classList].map((c) => c.replace(/^_/, '').replace(/_[a-z0-9]+_\\d+$/i, '')).join('.');
    const texto = (el.textContent ?? '').trim().replace(/\\s+/g, ' ').slice(0, 50);
    return el.tagName.toLowerCase() + (clases ? '.' + clases : '') + (texto ? ' «' + texto + '»' : '');
  };
  const anotar = (tipo, el, detalle) => {
    const clave = tipo + '|' + nombre(el);
    if (vistos.has(clave)) return;
    vistos.add(clave);
    hallazgos.push(tipo + ': ' + nombre(el) + (detalle ? ' (' + detalle + ')' : ''));
  };
  const recorta = (v) => v === 'hidden' || v === 'clip';
  const desplaza = (v) => v === 'auto' || v === 'scroll';
  const ancho = document.documentElement.clientWidth;

  for (const el of document.body.querySelectorAll('*')) {
    // los adornos (aria-hidden) se animan saliendose de su caja a proposito
    // un campo de texto desplaza su contenido al escribir: no es un desborde
    if (el.closest('svg') || el.closest('textarea') || el.tagName === 'INPUT' || el.closest('[aria-hidden="true"]')) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.display === 'inline') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;

    const sobraX = el.scrollWidth - el.clientWidth;
    const sobraY = el.scrollHeight - el.clientHeight;
    // lo que se recorta a proposito lleva el contenido completo en un title, propio o de un antepasado
    const conTitle = el.closest('[title]') !== null;
    if (sobraX > 1 && recorta(cs.overflowX) && !conTitle) {
      anotar(cs.textOverflow === 'ellipsis' ? 'abreviado sin title' : 'recortado de ancho', el, sobraX + ' px');
    }
    if (sobraY > 2 && recorta(cs.overflowY) && el.clientHeight > 0 && !conTitle) anotar('recortado de alto', el, sobraY + ' px');
    // un menu desplegado cuelga de su boton y es mas ancho que el: de el solo importa que entre en la ventana
    if (sobraX > 1 && cs.overflowX === 'visible' && el.clientWidth > 0 && !el.querySelector('.popover-panel')) {
      anotar('se sale de su caja', el, sobraX + ' px');
    }
    if (sobraX > 1 && desplaza(cs.overflowX) && !el.closest('section[aria-label="Línea de tiempo"]')
      && !el.closest('section[aria-label="Editor"]')) anotar('se desplaza de costado', el, sobraX + ' px');

    // lo que queda a la izquierda de un contenedor que recorta no se alcanza ni desplazando
    let contenedor = el.parentElement;
    while (contenedor && getComputedStyle(contenedor).overflowX === 'visible') contenedor = contenedor.parentElement;
    if (contenedor && cs.position !== 'fixed' && contenedor.scrollLeft === 0) {
      const borde = contenedor.getBoundingClientRect().left;
      if (r.left < borde - 1 && r.right > borde) anotar('cortado a la izquierda', el, Math.round(borde - r.left) + ' px');
    }

    if (r.right > ancho + 1 && cs.position !== 'fixed') {
      // dentro de un panel que se desplaza, salirse de la ventana es lo esperado
      let p = el.parentElement;
      let enDesplazable = false;
      while (p) { if (desplaza(getComputedStyle(p).overflowX)) { enDesplazable = true; break; } p = p.parentElement; }
      if (!enDesplazable) anotar('fuera de la ventana', el, Math.round(r.right - ancho) + ' px');
    }
    // un flotante no se alcanza desplazando; un menu desplegado si puede quedar mas abajo, en
    // un panel que se desplaza, pero no salirse por los costados
    const porLosCostados = r.right > ancho + 1 || r.left < -1;
    if (cs.position === 'fixed' && (porLosCostados || r.bottom > window.innerHeight + 1 || r.top < -1)) {
      anotar('flotante fuera de la ventana', el);
    }
    if (el.classList.contains('popover-panel') && porLosCostados) anotar('menú fuera de la ventana', el);
  }
  return hallazgos;
})()`;

// --- navegador ---

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
/** Alto de la ventana si el escenario no fija uno; con ALTO=2000 las capturas muestran un panel entero. */
const ALTO = Number(process.env.ALTO ?? 780);

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

async function revisar({ nombre, programa, pasos, antes = [], ancho = 1280, alto = ALTO }, carpeta) {
  const puerto = 9300 + Math.floor(Math.random() * 500);
  const navegador = spawn(chrome(), [
    '--headless=new', `--remote-debugging-port=${puerto}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'desborde-'))}`,
    'about:blank',
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
    const evaluar = async (expression) => {
      const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.result?.exceptionDetails) throw new Error(`${nombre}: ${r.result.exceptionDetails.exception?.description ?? 'error en la página'}`);
      return r.result?.result?.value;
    };

    await cdp('Page.enable');
    await cdp('Emulation.setDeviceMetricsOverride', { width: ancho, height: alto, deviceScaleFactor: 1, mobile: false });
    await cdp('Page.navigate', { url: `${URL_BASE}/${enlace(programa)}` });
    await esperar(1500);
    for (let i = 0; i < pasos; i++) {
      // un Paso de mas despues del fin volveria a empezar, con otra semilla
      const estado = await evaluar("document.querySelector('header [role=status]').textContent");
      if (/Terminó|Deadlock|Fin con errores|Error/.test(estado)) break;
      await evaluar("[...document.querySelectorAll('header button')].find((b) => b.textContent.trim().startsWith('Paso')).click()");
      await esperar(40);
    }
    for (const paso of antes) { await evaluar(paso); await esperar(250); }
    // con las animaciones de entrada terminadas: a mitad de camino un chip mide menos
    await esperar(900);
    const hallazgos = await evaluar(DETECTAR);
    if (carpeta) {
      // RECORTE=<selector> guarda solo ese elemento (un panel), para verlo de cerca
      let clip;
      if (process.env.RECORTE) {
        const r = await evaluar(`(() => { const r = document.querySelector(${JSON.stringify(process.env.RECORTE)}).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`);
        clip = { ...r, scale: 1 };
      }
      const imagen = await cdp('Page.captureScreenshot', { format: 'png', ...(clip && { clip }) });
      writeFileSync(join(carpeta, `${nombre.replace(/\s+/g, '-')}.png`), Buffer.from(imagen.result.data, 'base64'));
    }
    ws.close();
    return hallazgos;
  } finally {
    navegador.kill();
  }
}

const argumentos = process.argv.slice(2);
const iCapturas = argumentos.indexOf('--capturas');
const carpeta = iCapturas >= 0 ? argumentos[iCapturas + 1] : null;
const palabras = argumentos.filter((a, i) => a !== '--capturas' && (iCapturas < 0 || i !== iCapturas + 1));
if (carpeta) mkdirSync(carpeta, { recursive: true });

const elegidos = ESCENARIOS.filter((e) => palabras.every((p) => e.nombre.includes(p)));
if (elegidos.length === 0) { console.error('Ningún escenario contiene esas palabras.'); process.exit(1); }

console.log(`Control de desborde en ${URL_BASE}:`);
let total = 0;
for (const escenario of elegidos) {
  const hallazgos = await revisar(escenario, carpeta);
  total += hallazgos.length;
  console.log(`  ${hallazgos.length === 0 ? 'OK   ' : 'FALLA'} ${escenario.nombre}${escenario.ancho ? ` (${escenario.ancho} px)` : ''}`);
  for (const h of hallazgos) console.log(`          ${h}`);
}
console.log(total === 0 ? 'Sin desbordes.' : `${total} desbordes.`);
process.exitCode = total === 0 ? 0 : 1;
