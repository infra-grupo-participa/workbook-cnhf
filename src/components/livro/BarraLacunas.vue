<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import ChevronLeft from '@lucide/vue/dist/esm/icons/chevron-left.mjs'
import ChevronRight from '@lucide/vue/dist/esm/icons/chevron-right.mjs'
import Mic from '@lucide/vue/dist/esm/icons/mic.mjs'

/* Barra de lacunas — rodapé fixo discreto: contador, salto anterior/próxima
   (alvos ≥44px no toque) e ditado por voz. Sobe junto com o teclado
   virtual no celular (visualViewport). */
defineProps({
  atual: { type: Number, default: null },     // nº da lacuna focada (1-based)
  total: { type: Number, default: 0 },
  preenchidas: { type: Number, default: 0 },
  vozSuportada: { type: Boolean, default: false },
  gravando: { type: Boolean, default: false },
})
defineEmits(['anterior', 'proxima', 'voz'])

// mantém a barra acima do teclado virtual (iOS/Android)
const desloc = ref(0)
function medir() {
  const vv = window.visualViewport
  if (!vv) return
  desloc.value = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
}
onMounted(() => {
  const vv = window.visualViewport
  if (!vv) return
  vv.addEventListener('resize', medir)
  vv.addEventListener('scroll', medir)
})
onBeforeUnmount(() => {
  const vv = window.visualViewport
  if (!vv) return
  vv.removeEventListener('resize', medir)
  vv.removeEventListener('scroll', medir)
})
</script>

<template>
  <div class="barra-wrap" :style="{ transform: `translateY(-${desloc}px)` }">
    <div class="barra" role="toolbar" aria-label="Navegação entre lacunas">
      <button class="b-nav" aria-label="Lacuna anterior (Shift+Tab)"
        @mousedown.prevent @click="$emit('anterior')">
        <ChevronLeft :size="18" aria-hidden="true" />
      </button>

      <span class="b-info" aria-live="off">
        <template v-if="atual">lacuna {{ atual }}/{{ total }}</template>
        <template v-else>{{ preenchidas }}/{{ total }} preenchidas</template>
      </span>

      <button class="b-nav" aria-label="Próxima lacuna (Tab)"
        @mousedown.prevent @click="$emit('proxima')">
        <ChevronRight :size="18" aria-hidden="true" />
      </button>

      <button v-if="vozSuportada" class="b-mic" :class="{ gravando }"
        :aria-pressed="gravando"
        :aria-label="gravando ? 'Parar ditado por voz' : 'Ditar por voz na lacuna atual'"
        @mousedown.prevent @click="$emit('voz')">
        <Mic :size="16" aria-hidden="true" />
        <span v-if="gravando" class="b-rec">gravando…</span>
      </button>

      <span class="b-dica" aria-hidden="true"><kbd>Tab</kbd> próxima lacuna</span>
    </div>
  </div>
</template>

<style scoped>
.barra-wrap {
  position: fixed;
  left: 0; right: 0; bottom: 12px;
  z-index: 25;
  display: flex;
  justify-content: center;
  pointer-events: none;
}
.barra {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: color-mix(in srgb, var(--papel) 92%, var(--tinta) 8%);
  border: 1px solid var(--pauta-suave);
  border-radius: 999px;
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.16);
  font-family: var(--fonte-ui);
}
.b-nav, .b-mic {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 44px;
  min-height: 44px;
  padding: 0 8px;
  background: transparent;
  color: var(--tinta);
  border: none;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.15s;
}
.b-nav:hover, .b-mic:hover { background: var(--resposta-bg); }
.b-info {
  font-size: 12.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--tinta-2);
  min-width: 96px;
  text-align: center;
}
.b-mic.gravando { color: var(--bad); background: rgba(229, 83, 61, 0.12); }
.b-mic.gravando :deep(svg) { animation: mic-pulso 1.2s ease-in-out infinite; }
@keyframes mic-pulso { 50% { opacity: 0.4; } }
.b-rec { font-size: 11.5px; font-weight: 700; }
.b-dica {
  font-size: 11.5px;
  color: var(--tinta-2);
  padding: 0 10px 0 6px;
  border-left: 1px solid var(--pauta-suave);
  margin-left: 4px;
  white-space: nowrap;
}
.b-dica kbd {
  font-family: var(--fonte-ui);
  font-size: 10.5px;
  font-weight: 700;
  border: 1px solid var(--pauta-suave);
  border-bottom-width: 2px;
  border-radius: 4px;
  padding: 1px 5px;
  margin-right: 3px;
}
/* toque: sem dica de teclado */
@media (hover: none) and (pointer: coarse) { .b-dica { display: none; } }
@media (max-width: 560px) { .barra-wrap { bottom: 8px; } }
</style>
