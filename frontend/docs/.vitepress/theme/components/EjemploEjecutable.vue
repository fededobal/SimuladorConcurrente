<script setup lang="ts">
// Un programa de la guia que se ejecuta en el lugar. Envuelve al bloque de codigo (lo pone
// markdown.ts cuando el bloque es un programa completo) y le suma una barra con Ejecutar,
// Paso y Reiniciar, el estado de la ejecucion y la salida de los write.
//
// Mientras corre, cada renglon con procesos lleva la franja del color del estado y la
// etiqueta con quien esta ahi, como en el editor del simulador: las marcas salen del mismo
// codigo (src/editor/lineMarks.ts), asi dicen lo mismo en los dos lados. El dibujo del
// monitor, la linea de tiempo y los procesos se ven en el simulador ("Abrir en el simulador").
//
// De un instante al siguiente nada salta, igual que en el simulador: la franja y las
// etiquetas van por proceso (el mas activo del renglon), no por renglon, asi que cuando ese
// proceso avanza son los mismos elementos y se deslizan hasta el renglon nuevo; al cambiar
// de estado pasan de un color al otro, y lo que aparece o se va lo hace con un fundido.
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { activeLinesOf, lineMarksOf, tagNote, type LineMark } from '../../../../src/editor/lineMarks';
import { slideMs } from '../../../../src/motion';
import { STATE_CLASS } from '../../../../src/processStates';
import { statusTextOf } from '../../../../src/statusText';
import type { OutputLine, Snapshot } from '../../../../src/types';
import { cargarMotor, decodificar, semillaNueva, soltarMotor, tomarMotor } from '../ejecucion';

const props = defineProps<{
  /** El programa del bloque, en base64 para URL. */
  codigo: string;
}>();

/** Los mismos estados que la simulacion del simulador (src/useSimulation.ts). */
type Estado = 'idle' | 'running' | 'paused' | 'finished' | 'deadlock' | 'error';

/** Cuanto dura un instante cuando corre solo, en ms: la velocidad "Normal" del simulador. */
const PASO_MS = 600;
/** Lineas de la salida que se muestran: las ultimas. */
const MAX_SALIDA = 200;
/** Separacion entre el codigo de un renglon y sus etiquetas, y entre las etiquetas y el borde, en px. */
const AIRE_ETIQUETAS = 14;
const MARGEN_ETIQUETAS = 12;
/** Cuanto tarda en desvanecerse una marca que se va, en ms; igual a la transicion de .ej-sale. */
const SALIDA_MS = 180;

type Motor = Awaited<ReturnType<typeof cargarMotor>>;

const raiz = ref<HTMLElement | null>(null);
const cajaSalida = ref<HTMLElement | null>(null);
const estado = ref<Estado>('idle');
const instante = ref(0);
const esperando = ref(false);
const salida = ref<readonly OutputLine[]>([]);
/** Procesos que terminaron por un error de ejecucion. */
const fallidos = ref<readonly { nombre: string; linea: number; error: string }[]>([]);
/** Error de compilacion o del motor, con su linea si la tiene. */
const fallo = ref<{ mensaje: string; linea: number | null } | null>(null);

let motor: Motor | null = null;
let reloj: number | null = null;
/** Lo que se dibuja sobre el renglon de un proceso: su franja y sus etiquetas. */
interface Marca {
  readonly franja: HTMLElement;
  readonly etiquetas: HTMLElement;
  /** Las etiquetas por su primer proceso: si cambia de estado, es el mismo elemento. */
  readonly porProceso: Map<string, HTMLElement>;
}

/** Las marcas a la vista, por el proceso mas activo de su renglon. */
const marcas = new Map<string, Marca>();
/** Las franjas de los renglones con un error, por linea. */
const franjasDeError = new Map<number, HTMLElement>();
/** Lo ultimo que se marco, para volver a ubicarlo si cambia el ancho de la ventana. */
let ultimo: { marcas: readonly LineMark[]; errores: readonly number[] } = { marcas: [], errores: [] };

const corriendo = computed(() => estado.value === 'running');
const iniciado = computed(() => estado.value !== 'idle');
const texto = computed(() => statusTextOf(estado.value, esperando.value, fallidos.value.length));
const salidaVisible = computed(() => salida.value.slice(-MAX_SALIDA));

/** Medidas del bloque de codigo, que es HTML fijo generado por el resaltador. */
interface Bloque {
  readonly pre: HTMLElement;
  /** Los renglones: un `span.line` por linea del programa. */
  readonly renglones: readonly HTMLElement[];
  /** Donde empieza el primer renglon y cuanto mide cada uno, en px. */
  readonly arriba: number;
  readonly alto: number;
}

function bloque(): Bloque | null {
  const pre = raiz.value?.querySelector<HTMLElement>('pre');
  const code = pre?.querySelector<HTMLElement>('code');
  if (!pre || !code) return null;
  return {
    pre,
    renglones: Array.from(code.querySelectorAll<HTMLElement>('.line')),
    arriba: code.offsetTop,
    alto: parseFloat(getComputedStyle(code).lineHeight),
  };
}

/** Un elemento que se dibuja sobre el codigo; vp-copy-ignore: el boton Copiar no se lo lleva. */
function crear(clase: string): HTMLElement {
  const el = document.createElement('span');
  el.className = `${clase} vp-copy-ignore`;
  return el;
}

/** Saca un elemento con un fundido en vez de borrarlo de golpe. */
function sacar(el: HTMLElement): void {
  el.classList.add('ej-sale');
  window.setTimeout(() => el.remove(), SALIDA_MS);
}

function quitarMarcas(): void {
  for (const m of marcas.values()) {
    m.franja.remove();
    m.etiquetas.remove();
  }
  for (const franja of franjasDeError.values()) franja.remove();
  marcas.clear();
  franjasDeError.clear();
  ultimo = { marcas: [], errores: [] };
}

/** Escribe en una etiqueta el nombre del proceso (o de la familia) y donde esta. */
function escribir(el: HTMLElement, clase: string, color: string | null, titulo: string, nota: string): void {
  el.className = `ej-etiqueta ${clase}`;
  if (color) el.style.setProperty('--st-proceso', color);
  const texto = nota ? `${titulo} · ${nota}` : titulo;
  // solo si cambio: reescribir el contenido en cada instante no aporta nada
  if (el.dataset.texto === texto) return;
  el.dataset.texto = texto;
  const nombre = document.createElement('b');
  nombre.textContent = titulo;
  el.replaceChildren(nombre, nota ? ` · ${nota}` : '');
}

/** Deja en `etiquetas` las etiquetas de la marca, en orden, reusando las que ya estaban. */
function ponerEtiquetas(marca: Marca, m: LineMark): void {
  const claves: string[] = [];
  const poner = (clave: string, clase: string, color: string | null, titulo: string, nota: string, ayuda: string) => {
    let el = marca.porProceso.get(clave);
    if (!el) {
      el = document.createElement('span');
      marca.porProceso.set(clave, el);
    }
    escribir(el, clase, color, titulo, nota);
    el.title = ayuda;
    // solo se mueve si no esta en su lugar: volver a insertarla reiniciaria su fundido
    const lugar = marca.etiquetas.children[claves.length];
    if (lugar !== el) marca.etiquetas.insertBefore(el, lugar ?? null);
    claves.push(clave);
  };
  for (const t of m.tags) {
    poner(t.names[0], STATE_CLASS[t.state], t.color, t.title, tagNote(t),
      t.names.length > 1 ? t.names.join(', ') : '');
  }
  if (m.hiddenNames.length > 0) {
    poner('+', 'st-ready', null, `+${m.hiddenNames.length}`, '',
      `También en este renglón: ${m.hiddenNames.join(', ')}`);
  }
  for (const [clave, el] of marca.porProceso) {
    if (!claves.includes(clave)) {
      el.remove();
      marca.porProceso.delete(clave);
    }
  }
}

/**
 * Donde van las etiquetas de un renglon: a continuacion de su codigo. No ocupan ancho (van
 * posicionadas sobre el bloque): si ocuparan, un renglon largo lo ensancharia y la barra de
 * desplazamiento apareceria y desapareceria de un instante al otro. Si el codigo llega
 * hasta el borde, se quedan dentro de lo visible, sobre el final del renglon.
 */
function lugarDeEtiquetas(
  b: Bloque, renglon: HTMLElement | undefined, ancho: number,
): { izquierda: number; tope: number } {
  const borde = b.pre.getBoundingClientRect().left - b.pre.scrollLeft;
  const fin = renglon?.lastElementChild
    ? renglon.lastElementChild.getBoundingClientRect().right - borde
    : parseFloat(getComputedStyle(b.pre.querySelector('code') ?? b.pre).paddingLeft);
  // lo mas a la derecha que pueden empezar sin salirse de lo visible
  const tope = b.pre.scrollLeft + b.pre.clientWidth - ancho - MARGEN_ETIQUETAS;
  return { izquierda: Math.round(Math.max(MARGEN_ETIQUETAS, Math.min(fin + AIRE_ETIQUETAS, tope))), tope };
}

/**
 * Pone las marcas del instante sobre el codigo. Se escribe directo en el DOM porque el
 * bloque es HTML fijo que genero el resaltador: Vue no lo dibuja. Cada marca se identifica
 * por el proceso mas activo de su renglon: si ya estaba, se le cambia el lugar y el color (y
 * las transiciones de CSS la llevan); si es nueva, entra con un fundido; la que ya no esta,
 * se va con otro.
 */
function marcar(lista: readonly LineMark[], lineasConError: readonly number[]): void {
  const b = bloque();
  if (!b) return;
  ultimo = { marcas: lista, errores: lineasConError };
  const ancho = `${b.pre.scrollWidth}px`;
  const arribaDe = (linea: number) => `${b.arriba + (linea - 1) * b.alto}px`;

  const vistas = new Set<string>();
  for (const m of lista) {
    if (m.line > b.renglones.length) continue;
    vistas.add(m.leader);
    let marca = marcas.get(m.leader);
    const nueva = !marca;
    if (!marca) {
      marca = { franja: crear('ej-franja'), etiquetas: crear('ej-etiquetas'), porProceso: new Map() };
      marcas.set(m.leader, marca);
    }
    marca.franja.className = `ej-franja vp-copy-ignore ${STATE_CLASS[m.state]}`;
    marca.franja.style.setProperty('--st-proceso', m.color);
    Object.assign(marca.franja.style, { top: arribaDe(m.line), height: `${b.alto}px`, width: ancho });
    ponerEtiquetas(marca, m);
    Object.assign(marca.etiquetas.style, { top: arribaDe(m.line), height: `${b.alto}px` });
    // una marca nueva se agrega ya en su lugar: sin un lugar anterior no hay deslizamiento
    if (nueva) b.pre.append(marca.franja, marca.etiquetas);
    const lugar = lugarDeEtiquetas(b, b.renglones[m.line - 1], marca.etiquetas.offsetWidth);
    // Si el texto se alargo y desde donde estaban ya no entran, van a su lugar sin deslizarse
    // de costado: a mitad de camino se saldrian del bloque y aparecería la barra de desplazamiento.
    const desde = parseFloat(marca.etiquetas.style.left);
    marca.etiquetas.classList.toggle('ej-sin-costado', !nueva && desde > lugar.tope);
    marca.etiquetas.style.left = `${lugar.izquierda}px`;
  }
  for (const [lider, marca] of marcas) {
    if (vistas.has(lider)) continue;
    sacar(marca.franja);
    sacar(marca.etiquetas);
    marcas.delete(lider);
  }

  for (const linea of lineasConError) {
    if (linea < 1 || linea > b.renglones.length) continue;
    let franja = franjasDeError.get(linea);
    if (!franja) {
      franja = crear('ej-franja ej-error');
      franjasDeError.set(linea, franja);
      b.pre.append(franja);
    }
    Object.assign(franja.style, { top: arribaDe(linea), height: `${b.alto}px`, width: ancho });
  }
  for (const [linea, franja] of franjasDeError) {
    if (lineasConError.includes(linea)) continue;
    sacar(franja);
    franjasDeError.delete(linea);
  }
}

/** Muestra un instante: marcas en el codigo, salida y procesos que fallaron. */
function mostrar(snapshot: Snapshot): void {
  instante.value = snapshot.instant;
  salida.value = snapshot.output;
  fallidos.value = snapshot.processes
    .filter((p) => p.error !== null)
    .map((p) => ({ nombre: p.name, linea: p.line, error: p.error ?? '' }));
  marcar(lineMarksOf(activeLinesOf(snapshot.processes)), fallidos.value.map((f) => f.linea));
  // la salida sigue a su ultima linea, como una consola
  void nextTick(() => {
    const caja = cajaSalida.value;
    if (caja) caja.scrollTop = caja.scrollHeight;
  });
}

function pararReloj(): void {
  if (reloj !== null) window.clearInterval(reloj);
  reloj = null;
}

/** Otro bloque tomo el motor: este vuelve a quedar sin ejecutar. */
function perderMotor(): void {
  pararReloj();
  quitarMarcas();
  salida.value = [];
  fallidos.value = [];
  fallo.value = null;
  esperando.value = false;
  instante.value = 0;
  estado.value = 'idle';
}

function falla(e: unknown): void {
  const error = e as { message?: string; line?: number | null };
  pararReloj();
  fallo.value = { mensaje: error.message ?? 'No se pudo ejecutar el programa.', linea: error.line ?? null };
  if (fallo.value.linea !== null) marcar([], [fallo.value.linea]);
  estado.value = 'error';
}

/** Compila el programa y lo deja en el instante 0, con una semilla nueva. */
async function iniciar(): Promise<boolean> {
  motor = await cargarMotor();
  tomarMotor(perderMotor);
  fallo.value = null;
  try {
    const creada = motor.create(decodificar(props.codigo), semillaNueva());
    esperando.value = false;
    mostrar(creada.snapshot);
    estado.value = creada.deadlock ? 'deadlock' : creada.finished ? 'finished' : 'paused';
    return true;
  } catch (e) {
    falla(e);
    return false;
  }
}

/** Avanza un instante; false si la ejecucion no puede seguir. */
function avanzar(): boolean {
  if (!motor) return false;
  try {
    const r = motor.step('RANDOM');
    esperando.value = r.waiting;
    mostrar(r.snapshot);
    if (r.deadlock || r.finished) {
      pararReloj();
      estado.value = r.deadlock ? 'deadlock' : 'finished';
      return false;
    }
    return true;
  } catch (e) {
    falla(e);
    return false;
  }
}

/** true si hay que compilar antes del proximo paso: no hay ejecucion, o ya termino. */
function hayQueIniciar(): boolean {
  return estado.value !== 'running' && estado.value !== 'paused';
}

async function ejecutar(): Promise<void> {
  if (corriendo.value) {
    pararReloj();
    estado.value = 'paused';
    return;
  }
  if (hayQueIniciar() && !(await iniciar())) return;
  if (estado.value !== 'paused') return;
  estado.value = 'running';
  pararReloj();
  reloj = window.setInterval(avanzar, PASO_MS);
}

async function paso(): Promise<void> {
  pararReloj();
  if (hayQueIniciar()) {
    await iniciar();
    return;
  }
  estado.value = 'paused';
  avanzar();
}

function reiniciar(): void {
  perderMotor();
  soltarMotor(perderMotor);
  motor?.remove();
}

// Si cambia el ancho de la ventana, las etiquetas se vuelven a ubicar: su lugar depende de
// cuanto codigo se ve.
function reubicar(): void {
  if (marcas.size > 0 || franjasDeError.size > 0) marcar(ultimo.marcas, ultimo.errores);
}
onMounted(() => window.addEventListener('resize', reubicar));

onBeforeUnmount(() => {
  window.removeEventListener('resize', reubicar);
  if (iniciado.value) reiniciar();
});
</script>

<template>
  <div ref="raiz" class="ejecutable" :class="{ 'ej-activo': iniciado }"
    :style="{ '--ej-desliz': `${slideMs(PASO_MS)}ms` }">
    <slot />
    <div class="ej-barra">
      <button type="button" class="ej-boton ej-principal" @click="ejecutar">
        {{ corriendo ? 'Pausar' : iniciado && estado === 'paused' ? 'Seguir' : 'Ejecutar' }}
      </button>
      <button type="button" class="ej-boton" :disabled="corriendo" @click="paso"
        title="Avanzar un instante">
        Paso
      </button>
      <button v-if="iniciado" type="button" class="ej-boton" @click="reiniciar"
        title="Volver al programa sin ejecutar">
        Reiniciar
      </button>
      <span v-if="iniciado" class="ej-estado" :class="`ej-tono-${texto.tone}`" role="status">
        <span class="ej-punto" aria-hidden="true" />
        {{ texto.text }}<template v-if="estado !== 'error'"> · instante {{ instante }}</template>
      </span>
      <span v-else class="ej-ayuda">Se ejecuta acá, con turnos al azar.</span>
    </div>
    <div v-if="fallo" class="ej-fallo" role="alert">
      <template v-if="fallo.linea !== null">línea {{ fallo.linea }}: </template>{{ fallo.mensaje }}
    </div>
    <div v-for="f in fallidos" :key="f.nombre" class="ej-fallo" role="alert">
      {{ f.nombre }}<template v-if="f.linea > 0">, línea {{ f.linea }}</template>: error de ejecución: {{ f.error }}
    </div>
    <div v-if="iniciado && estado !== 'error'" ref="cajaSalida" class="ej-salida" role="log"
      aria-label="Salida del programa">
      <p v-if="salida.length === 0" class="ej-vacia">Acá aparece lo que escriben los procesos con write().</p>
      <div v-for="(l, i) in salidaVisible" :key="i" class="ej-linea">
        <span class="ej-instante" :title="`instante ${l.instant}`">{{ l.instant }}</span>
        <span class="ej-quien" :style="{ '--st-proceso': l.color }">{{ l.process }}</span>
        <span>{{ l.text }}</span>
      </div>
    </div>
  </div>
</template>
