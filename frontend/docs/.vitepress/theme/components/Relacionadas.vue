<script setup lang="ts">
import { computed } from 'vue';
import { useData, withBase } from 'vitepress';
import type { Guia } from '../../guia';

// Paginas relacionadas, debajo del indice "En esta página". Salen del campo `relacionadas`
// del encabezado de la pagina (una lista de enlaces); cada una se muestra con su numero.

const { theme, frontmatter } = useData();

const paginas = computed(() => {
  const guia = theme.value.guia as Guia;
  const enlaces = (frontmatter.value.relacionadas ?? []) as string[];
  return enlaces.map((enlace) => guia.paginas[enlace]).filter((p) => p !== undefined);
});
</script>

<template>
  <div v-if="paginas.length > 0" class="relacionadas">
    <p class="relacionadas-titulo">Relacionadas</p>
    <ul>
      <li v-for="p in paginas" :key="p.enlace">
        <a :href="withBase(p.enlace)"><span class="num">{{ p.numero }}</span> {{ p.titulo }}</a>
      </li>
    </ul>
  </div>
</template>
