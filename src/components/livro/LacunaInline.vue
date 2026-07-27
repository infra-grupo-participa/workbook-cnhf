<script setup>
import { computed } from 'vue'

/* Lacuna inline — linha pautada que cresce com o conteúdo.
   Um espelho oculto (mesma fonte) dimensiona o campo via inline-grid;
   vazia, ela mostra um traço proporcional à resposta esperada (`largura`). */
const props = defineProps({
  modelValue: { type: String, default: '' },
  bloco: { type: Object, required: true },  // { id, largura, sufixo… }
  meta: { type: Object, default: null },    // { n, total, rotulo }
})
defineEmits(['update:modelValue'])

const LARGURAS = { xs: 6, sm: 10, md: 18, lg: 28, xl: 40 } // em ch
const minCh = computed(() => LARGURAS[props.bloco.largura] || 18)
const rotuloAria = computed(() =>
  props.meta
    ? `Lacuna ${props.meta.n} de ${props.meta.total} — ${props.meta.rotulo}`
    : 'Lacuna para preencher')
</script>

<template>
  <span class="lac-inline">
    <span class="lac-espelho" aria-hidden="true">{{ modelValue || '' }}</span>
    <input
      class="lac-campo"
      type="text"
      :value="modelValue || ''"
      :data-lacuna="bloco.id"
      :aria-label="rotuloAria"
      :style="{ minWidth: minCh + 'ch' }"
      spellcheck="false"
      autocomplete="off"
      autocapitalize="off"
      enterkeyhint="next"
      @input="$emit('update:modelValue', $event.target.value)" />
  </span>
</template>

<style scoped>
.lac-inline {
  display: inline-grid;
  vertical-align: baseline;
  max-width: 100%;
  margin: 0 1px;
}
.lac-espelho,
.lac-campo {
  grid-area: 1 / 1;
  font: inherit;
  font-style: italic;
  letter-spacing: 0.01em;
  padding: 0 0.35ch;
  border: 0;
  min-width: 0;
}
.lac-espelho { visibility: hidden; white-space: pre; }
.lac-campo {
  width: 100%;
  scroll-margin-top: 84px;
  scroll-margin-bottom: 110px;
  background: transparent;
  color: var(--resposta);
  caret-color: var(--resposta);
  border-bottom: 1.5px solid var(--pauta);
  border-radius: 2px 2px 0 0;
  transition: background-color 0.15s, box-shadow 0.15s;
}
/* realce suave da lacuna atual — sem caixa, só tinta mais firme + halo */
.lac-campo:focus {
  outline: none;
  background: var(--resposta-bg);
  box-shadow: 0 1.5px 0 var(--resposta);
}
</style>
