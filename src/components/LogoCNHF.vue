<script setup>
// Logo oficial do lançamento (PNG, fundo transparente, fonte preta).
// A arte fica centralizada num canvas 1920x1080 com bastante margem vertical,
// então o height pedido é multiplicado pra que a marca renderize no tamanho
// visual esperado (o excesso é margem transparente, não ocupa layout à toa).
const props = defineProps({ height: { type: Number, default: 40 } })
</script>
<template>
  <img
    src="/logo-cnhf.png"
    class="logo-cnhf"
    alt="Curso Nacional de Formação em Holding Familiar"
    :style="{ height: (props.height * 1.9) + 'px' }"
  />
</template>
<style scoped>
.logo-cnhf {
  width: auto;
  max-width: 100%;
  object-fit: contain;
  display: block;
}
/* PNG tem a fonte preta fixa — no dark mode isso some no fundo escuro.
   Inverte a luminância (preto→branco) mantendo o laranja aproximado. */
:root[data-theme='dark'] .logo-cnhf {
  filter: invert(1) hue-rotate(180deg);
}
</style>
