<script setup>
import { ref, onBeforeUnmount } from 'vue'
import X from '@lucide/vue/dist/esm/icons/x.mjs'

/* Modal sobre <dialog> nativo: Esc fecha, fundo fica inerte, o foco volta
   sozinho para quem abriu. Nada de formulário empurrando o layout da página. */
defineProps({
  titulo: { type: String, required: true },
  largura: { type: Number, default: 460 },
})
const emit = defineEmits(['fechar'])
const el = ref(null)
const aberto = ref(false)

function abrir() {
  if (!el.value || aberto.value) return
  aberto.value = true
  el.value.showModal()
}
function fechar() { el.value?.close() }
function aoFechar() { aberto.value = false; emit('fechar') }
/* clique no backdrop (o target é o próprio <dialog>) fecha; clique no
   conteúdo, que vive num filho com padding, não fecha. */
function cliqueFora(e) { if (e.target === el.value) fechar() }
onBeforeUnmount(() => { try { el.value?.close() } catch { /* já fechado */ } })
defineExpose({ abrir, fechar })
</script>

<template>
  <dialog ref="el" class="mb" :style="{ '--mb-w': largura + 'px' }"
    @click="cliqueFora" @close="aoFechar" :aria-label="titulo">
    <div class="mb-in">
      <header class="mb-topo">
        <h2 class="mb-titulo">{{ titulo }}</h2>
        <button type="button" class="mb-x" aria-label="Fechar" @click="fechar">
          <X :size="18" :stroke-width="2" aria-hidden="true" />
        </button>
      </header>
      <slot />
    </div>
  </dialog>
</template>

<style scoped>
.mb {
  width: min(var(--mb-w), calc(100vw - 24px));
  margin: auto;
  padding: 0;
  border: 1px solid var(--stroke);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow);
}
.mb::backdrop { background: rgba(10, 8, 5, 0.45); backdrop-filter: blur(3px); }
.mb-in { padding: 20px 22px 22px; }
.mb-topo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.mb-titulo {
  margin: 0;
  font-family: var(--fonte-livro);
  font-size: 19px;
  font-weight: 700;
}
.mb-x {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px; height: 44px;
  margin: -10px -12px -10px 0;
  border: none;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--ink-2);
  cursor: pointer;
}
.mb-x:hover { color: var(--ink); background: var(--accent-soft); }

@media (max-width: 480px) {
  /* mobile: sobe do rodapé como folha, mais fácil de alcançar com o polegar */
  .mb { margin: auto auto 0; width: 100vw; max-width: none;
    border-radius: var(--radius) var(--radius) 0 0; border-bottom: none; }
}
</style>
