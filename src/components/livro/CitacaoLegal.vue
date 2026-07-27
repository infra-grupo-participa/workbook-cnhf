<script setup>
import LacunaBloco from './LacunaBloco.vue'

/* Citação legal — bloco recuado com rótulo em versalete, como uma
   transcrição de dispositivo legal num livro de doutrina. */
defineProps({
  modelValue: { type: String, default: '' },
  bloco: { type: Object, required: true },  // { id, rotulo, linhas, sufixo… }
  meta: { type: Object, default: null },
})
defineEmits(['update:modelValue'])
</script>

<template>
  <figure class="citacao">
    <figcaption class="cit-rotulo">{{ bloco.rotulo }}</figcaption>
    <LacunaBloco
      :model-value="modelValue"
      :bloco="bloco"
      :meta="meta"
      :sufixo="bloco.sufixo || ''"
      placeholder="Anote aqui a referência ditada…"
      @update:model-value="$emit('update:modelValue', $event)" />
  </figure>
</template>

<style scoped>
.citacao {
  margin: 1.5em 0 1.5em 1.25em;
  padding: 0.35em 0 0.35em 1.1em;
  border-left: 2px solid var(--pauta-suave);
  font-size: 0.94em;
}
.cit-rotulo {
  font-family: var(--fonte-ui);
  font-size: 0.72em;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--tinta-2);
  margin-bottom: 0.5em;
}
@media (max-width: 560px) {
  .citacao { margin-left: 0.25em; }
}
</style>
