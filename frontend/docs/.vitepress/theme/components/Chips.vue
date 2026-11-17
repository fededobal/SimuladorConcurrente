<script setup lang="ts">
// Lo esencial de una instruccion, en pocas palabras, debajo de su descripcion:
//   <Chips :items="['Sincronización', 'Solo dentro de un procedure']" />
// El primero es la categoria y va destacado.
defineProps<{ items: string[] }>();
</script>

<template>
  <ul class="chips" aria-label="Lo esencial">
    <li v-for="(item, i) in items" :key="item" :class="{ principal: i === 0 }">{{ item }}</li>
  </ul>
</template>
