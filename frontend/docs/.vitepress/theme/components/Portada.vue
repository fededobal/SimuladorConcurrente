<script setup lang="ts">
// Portada de la guia: los capitulos como el indice de un libro, cada uno con sus paginas
// numeradas, y accesos directos a lo que mas se busca (instrucciones, ejemplos, glosario).
import { computed } from 'vue';
import { useData, withBase } from 'vitepress';
import type { Guia } from '../../guia';

const { theme } = useData();
const guia = computed(() => theme.value.guia as Guia);

/** Recorrido sugerido para quien abre la guia por primera vez. */
const RECORRIDO = [
  { enlace: '/introduccion/primer-programa', nota: 'ejecutarlo y seguirlo' },
  { enlace: '/ejecucion/instantes-y-turnos', nota: 'por qué cada corrida cambia' },
  { enlace: '/ejecucion/variables-condicion', nota: 'wait y signal' },
  { enlace: '/operacion/deadlock', nota: 'qué hacer cuando nadie avanza' },
];
const recorrido = computed(() => RECORRIDO
  .map((r) => ({ ...r, pagina: guia.value.paginas[r.enlace] }))
  .filter((r) => r.pagina !== undefined));

/** Terminos del glosario que mas se consultan, con la letra bajo la que estan. */
const TERMINOS = [
  ['Monitor', 'm'], ['Variable condición', 'v'], ['Cola de entrada', 'c'],
  ['Signal and continue', 's'], ['Deadlock', 'd'], ['Entrelazado', 'e'],
  ['Instante', 'i'], ['Familia de procesos', 'f'],
];

/** La instruccion tal como se escribe: el titulo de su pagina, o `:=:` para el intercambio. */
function palabra(titulo: string): string {
  if (titulo.startsWith('Intercambio')) return ':=:';
  if (titulo === 'Asignación') return 'x = e';
  if (titulo === 'Llamada a monitor') return 'M.p()';
  return titulo;
}
</script>

<template>
  <div class="portada">
    <header class="portada-hero">
      <p class="portada-chip">Monitores · <i>signal and continue</i></p>
      <h1>Guía del Simulador de Monitores</h1>
      <p class="portada-bajada">
        Escribí programas con la notación de monitores, ejecutalos instante a instante y mirá qué
        hace cada proceso, quién tiene cada monitor y quién espera en cada variable condición.
      </p>
      <div class="portada-acciones">
        <a class="boton principal" href="/" target="_self">Abrir el simulador <span aria-hidden="true">↗</span></a>
        <a class="boton" :href="withBase('/introduccion/primer-programa')">
          Empezar por 1.2 Primer programa <span aria-hidden="true">→</span>
        </a>
      </div>
      <p class="portada-nota">
        {{ guia.capitulos.length }} capítulos · {{ guia.totalPaginas }} páginas · todo corre en el navegador, sin instalar nada
      </p>
    </header>

    <div class="portada-grilla">
      <section v-for="cap in guia.capitulos" :key="cap.numero" class="tarjeta">
        <header>
          <span class="tarjeta-num">{{ cap.numero }}</span>
          <div>
            <h2>{{ cap.titulo }}</h2>
            <p>{{ cap.descripcion }}</p>
          </div>
        </header>
        <ul class="tarjeta-paginas">
          <li v-for="p in cap.paginas" :key="p.enlace">
            <a :href="withBase(p.enlace)">
              <span class="num">{{ p.numero }}</span> {{ p.titulo }} <span class="flecha" aria-hidden="true">›</span>
            </a>
          </li>
        </ul>

        <div v-if="cap.numero === '1'" class="tarjeta-extra recorrido">
          <h3>Primera vez: recorrido sugerido</h3>
          <ol>
            <li v-for="r in recorrido" :key="r.enlace">
              <a :href="withBase(r.enlace)">
                <span><b>{{ r.pagina.numero }} {{ r.pagina.titulo }}</b>: {{ r.nota }}</span>
              </a>
            </li>
          </ol>
        </div>

        <div v-if="cap.numero === '2'" class="tarjeta-extra">
          <h3>Las {{ guia.instrucciones.length }} instrucciones</h3>
          <p class="chips-enlace">
            <a v-for="i in guia.instrucciones" :key="i.enlace" :href="withBase(i.enlace)"
              :title="`${i.numero} ${i.titulo}`"><code>{{ palabra(i.titulo) }}</code></a>
          </p>
        </div>

        <div v-if="cap.numero === '7'" class="tarjeta-extra">
          <h3>Del glosario</h3>
          <p class="chips-enlace">
            <a v-for="[termino, letra] in TERMINOS" :key="termino"
              :href="withBase(`/referencia/glosario#${letra}`)">{{ termino }}</a>
          </p>
        </div>

        <a class="boton chico" :href="withBase(cap.enlace)">
          Abrir el capítulo {{ cap.numero }} <span aria-hidden="true">›</span>
        </a>
      </section>

      <section class="tarjeta tarjeta-ejemplos">
        <header>
          <span class="tarjeta-num verde" aria-hidden="true">▸</span>
          <div>
            <h2>Probar un ejemplo</h2>
            <p>Los programas del menú Ejemplos, listos para abrir en el simulador. Todos pasan por las pruebas automáticas.</p>
          </div>
        </header>
        <ul class="tarjeta-paginas">
          <li v-for="(e, i) in guia.ejemplos" :key="e.id">
            <a :href="`/#ejemplo=${e.id}`" target="_self">
              <span class="num">{{ String(i + 1).padStart(2, '0') }}</span> {{ e.titulo }}
              <span class="abrir" aria-hidden="true">▸ Abrir</span>
            </a>
          </li>
        </ul>
        <a class="boton chico" :href="withBase('/referencia/ejemplos')">
          Ver los programas explicados (7.4) <span aria-hidden="true">›</span>
        </a>
      </section>
    </div>

    <footer class="portada-pie">
      <span><b>Simulador de Monitores</b> · Práctica Profesional Supervisada · Facultad de Informática, UNLP · Federico Dobal</span>
      <span>
        <a :href="withBase('/introduccion/presentacion#origen-del-simulador')">Origen del simulador</a>
        <a :href="withBase('/referencia/glosario')">Glosario</a>
      </span>
    </footer>
  </div>
</template>
