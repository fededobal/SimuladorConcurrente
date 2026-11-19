<script setup lang="ts">
// Figura con el dibujo de un monitor, el mismo que muestra el simulador: las tres zonas y
// una flecha destacada. Uso:
//   <FiguraMonitor flecha="wait" adentro="P" :espera="{ cv: 'P' }">
//     Al hacer <code>wait(cv)</code>, P sale de la zona Ejecutando...
//   </FiguraMonitor>
// El numero de la figura es el de la seccion de la pagina.
import { computed } from 'vue';
import { useData, useRoute } from 'vitepress';
import type { Guia } from '../../guia';

type Flecha = 'call' | 'entra' | 'wait' | 'signal' | 'return';

const props = defineProps<{
  /** Flecha que se destaca. */
  flecha: Flecha;
  /** Procesos que compiten por entrar. */
  compiten?: string[];
  /** Variable condicion -> proceso que espera en ella (cadena vacia: nadie). */
  espera?: Record<string, string>;
  /** Proceso que tiene el monitor. */
  adentro?: string;
}>();

const { theme, site } = useData();
const route = useRoute();
const numero = computed(() => {
  const guia = theme.value.guia as Guia;
  const enlace = route.path.replace(site.value.base, '/').replace(/\.html$/, '').replace(/index$/, '');
  return guia.paginas[enlace]?.numero ?? '';
});

const conds = computed(() => Object.entries(props.espera ?? {}));
const hayEspera = computed(() => conds.value.some(([, proceso]) => proceso !== ''));
const activa = (f: Flecha) => (props.flecha === f ? 'activa' : '');
</script>

<template>
  <figure class="figura-monitor">
    <svg viewBox="0 0 400 196" role="img" :aria-label="`Dibujo de un monitor con la flecha ${flecha} destacada`">
      <defs>
        <marker id="fm-punta" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" class="punta" />
        </marker>
        <marker id="fm-punta-activa" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" class="punta activa" />
        </marker>
      </defs>

      <path d="M2,148 L33,148" :class="['flecha', activa('call')]" :marker-end="`url(#fm-punta${flecha === 'call' ? '-activa' : ''})`" />
      <text x="2" y="141" :class="['rotulo', activa('call')]">call</text>
      <path d="M164,148 L235,148" :class="['flecha', activa('entra')]" :marker-end="`url(#fm-punta${flecha === 'entra' ? '-activa' : ''})`" />
      <text x="200" y="163" text-anchor="middle" :class="['rotulo', activa('entra')]">entra</text>
      <path d="M366,148 L398,148" :class="['flecha', activa('return')]" :marker-end="`url(#fm-punta${flecha === 'return' ? '-activa' : ''})`" />
      <text x="398" y="141" text-anchor="end" :class="['rotulo', activa('return')]">return</text>
      <path d="M314,106 C314,60 298,44 267,44" :class="['flecha', activa('wait')]" :marker-end="`url(#fm-punta${flecha === 'wait' ? '-activa' : ''})`" />
      <text x="322" y="74" :class="['rotulo', activa('wait')]">wait</text>
      <path d="M135,44 C102,44 86,60 86,104" :class="['flecha', activa('signal')]" :marker-end="`url(#fm-punta${flecha === 'signal' ? '-activa' : ''})`" />
      <text x="78" y="74" text-anchor="end" :class="['rotulo', activa('signal')]">signal</text>

      <rect x="137" y="6" width="126" height="76" rx="7" :class="['zona', { espera: hayEspera }]" />
      <text x="146" y="22" class="zona-titulo">2 · BLOQUEADO</text>
      <template v-for="([cond, proceso], i) in conds" :key="cond">
        <text x="146" :y="39 + i * 15" class="cond">{{ cond }}</text>
        <template v-if="proceso">
          <circle cx="204" :cy="35 + i * 15" r="3.5" class="proceso-punto" />
          <text x="211" :y="39 + i * 15" class="proceso">{{ proceso }}</text>
        </template>
        <text v-else x="200" :y="39 + i * 15" class="nota">vacía</text>
      </template>

      <rect x="36" y="108" width="126" height="80" rx="7" class="zona" />
      <text x="45" y="124" class="zona-titulo">1 · COMPITIENDO</text>
      <template v-if="compiten?.length">
        <template v-for="(proceso, i) in compiten" :key="proceso">
          <circle cx="48" :cy="139 + i * 15" r="3.5" class="proceso-punto" />
          <text x="56" :y="143 + i * 15" class="proceso">{{ proceso }}</text>
        </template>
      </template>
      <text v-else x="45" y="143" class="nota">nadie</text>

      <rect x="238" y="108" width="126" height="80" rx="7" :class="['zona', { ocupada: adentro }]" />
      <text x="247" y="124" class="zona-titulo">3 · EJECUTANDO</text>
      <template v-if="adentro">
        <circle cx="250" cy="139" r="3.5" class="proceso-punto" />
        <text x="258" y="143" class="proceso">{{ adentro }}</text>
      </template>
      <text v-else x="247" y="143" class="nota">nadie</text>
    </svg>
    <figcaption><b>Figura {{ numero }}.</b> <slot /></figcaption>
  </figure>
</template>
