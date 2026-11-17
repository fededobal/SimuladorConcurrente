<script setup lang="ts">
import { computed } from 'vue';
import { useData, useRoute, withBase } from 'vitepress';
import type { Guia } from '../../guia';

// Migas de la barra superior: "Guía › 2 Lenguaje › 2.9 Instrucciones › 2.9.8 wait". Dicen
// en que capitulo esta la pagina y permiten subir un nivel.

const { theme, site } = useData();
const route = useRoute();

const pagina = computed(() => {
  const guia = theme.value.guia as Guia;
  // la ruta llega con la base del sitio (/docs/) y a veces con .html
  const enlace = route.path.replace(site.value.base, '/').replace(/\.html$/, '').replace(/index$/, '');
  return guia.paginas[enlace];
});
</script>

<template>
  <nav v-if="pagina" class="migas" aria-label="Ubicación en la guía">
    <a :href="withBase('/')">Guía</a>
    <template v-for="e in pagina.camino" :key="e.enlace">
      <span aria-hidden="true">›</span>
      <a :href="withBase(e.enlace)">{{ e.numero }} {{ e.titulo }}</a>
    </template>
    <span aria-hidden="true">›</span>
    <b aria-current="page">{{ pagina.numero }} {{ pagina.titulo }}</b>
  </nav>
</template>
