<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Sun from '@lucide/vue/dist/esm/icons/sun.mjs'
import Moon from '@lucide/vue/dist/esm/icons/moon.mjs'
import BookOpen from '@lucide/vue/dist/esm/icons/book-open.mjs'
import { prefs } from './components/livro/usePreferencias.js'

/*
  Tema global (claro / sépia / escuro) vive em usePreferencias e é aplicado
  no <html>. No workbook o controle fica no Painel de Leitura; nas demais
  telas este botão cicla os três temas — no canto INFERIOR direito, onde
  não colide com o cabeçalho dos cards (bug antigo do FAB no topo).
*/
const route = useRoute()
const mostraFab = computed(() => route.name !== 'workbook')

const ORDEM = ['claro', 'sepia', 'escuro']
const ROTULOS = { claro: 'Tema claro', sepia: 'Tema sépia', escuro: 'Tema escuro' }
function ciclar() {
  const i = ORDEM.indexOf(prefs.tema)
  prefs.tema = ORDEM[(i + 1) % ORDEM.length]
}
const icone = computed(() =>
  prefs.tema === 'claro' ? Sun : prefs.tema === 'sepia' ? BookOpen : Moon)
const rotuloProximo = computed(() =>
  ROTULOS[ORDEM[(ORDEM.indexOf(prefs.tema) + 1) % ORDEM.length]])
</script>

<template>
  <div class="bg-orbs" />
  <button
    v-if="mostraFab"
    class="theme-fab"
    :title="`${ROTULOS[prefs.tema]} — mudar para ${rotuloProximo.toLowerCase()}`"
    :aria-label="`Tema atual: ${ROTULOS[prefs.tema]}. Ativar ${rotuloProximo.toLowerCase()}`"
    @click="ciclar">
    <component :is="icone" :size="18" :stroke-width="2" aria-hidden="true" />
  </button>
  <router-view />
</template>

<style scoped>
.theme-fab {
  position: fixed; bottom: 18px; right: 18px; z-index: 50;
  display: inline-flex; align-items: center; justify-content: center;
  width: 44px; height: 44px; border-radius: 50%;
  border: 1px solid var(--stroke); background: var(--glass); color: var(--ink);
  cursor: pointer; backdrop-filter: blur(14px);
  transition: border-color .15s, color .15s;
}
.theme-fab:hover { color: var(--accent); border-color: var(--accent-line); }
</style>
