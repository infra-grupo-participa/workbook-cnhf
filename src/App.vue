<script setup>
import { ref, watch } from 'vue'

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
    {{ theme === 'dark' ? '☀' : '☾' }}
  </button>
  <router-view />
</template>

<style scoped>
.theme-fab {
  position: fixed; top: 16px; right: 16px; z-index: 50;
  width: 40px; height: 40px; border-radius: 50%;
  border: 1px solid var(--stroke); background: var(--glass); color: var(--ink);
  font-size: 16px; cursor: pointer; backdrop-filter: blur(14px);
  transition: border-color .15s;
}
.theme-fab:hover { border-color: var(--accent-line); }
</style>
