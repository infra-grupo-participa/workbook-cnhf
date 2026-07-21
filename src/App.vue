<script setup>
import { ref, watch } from 'vue'
import Sun from '@lucide/vue/dist/esm/icons/sun.mjs'
import Moon from '@lucide/vue/dist/esm/icons/moon.mjs'

// dark por padrão, com opção de alternar (salva a preferência)
const theme = ref(localStorage.getItem('wb-theme') || 'dark')
watch(theme, (t) => {
  document.documentElement.dataset.theme = t
  localStorage.setItem('wb-theme', t)
}, { immediate: true })
function toggle() { theme.value = theme.value === 'dark' ? 'light' : 'dark' }
</script>

<template>
  <div class="bg-orbs" />
  <button class="theme-fab" @click="toggle" :title="theme === 'dark' ? 'Modo claro' : 'Modo escuro'">
    <component :is="theme === 'dark' ? Sun : Moon" :size="18" :stroke-width="2" />
  </button>
  <router-view />
</template>

<style scoped>
.theme-fab {
  position: fixed; top: 16px; right: 16px; z-index: 50;
  display: inline-flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border-radius: 50%;
  border: 1px solid var(--stroke); background: var(--glass); color: var(--ink);
  cursor: pointer; backdrop-filter: blur(14px);
  transition: border-color .15s, color .15s;
}
.theme-fab:hover { color: var(--accent); }
.theme-fab:hover { border-color: var(--accent-line); }
</style>
