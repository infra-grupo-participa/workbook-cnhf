<script setup>
import { computed, ref } from 'vue'

/* Abertura de capítulo — numeral romano grande, título, fio e ar.
   Momento de respiro: o leitor sente que entrou num capítulo. */
const props = defineProps({
  secao: { type: Object, required: true },
  preenchidas: { type: Number, default: 0 },
})

const titulo = ref(null)
defineExpose({ focarTitulo: () => titulo.value && titulo.value.focus() })

const numeral = computed(() =>
  props.secao.tipo === 'capitulo' ? props.secao.romano : `§${props.secao.numero}`)
const kicker = computed(() =>
  props.secao.tipo === 'capitulo'
    ? `Capítulo ${props.secao.romano}`
    : `Seção Extra ${props.secao.numero}`)
</script>

<template>
  <header class="abertura">
    <div class="ab-num" aria-hidden="true">{{ numeral }}</div>
    <p class="ab-kicker">{{ kicker }}</p>
    <h1 ref="titulo" class="ab-titulo" tabindex="-1">{{ secao.titulo }}</h1>
    <div class="ab-fio" aria-hidden="true"></div>
    <p class="ab-meta">
      {{ secao.total_lacunas }} {{ secao.total_lacunas === 1 ? 'lacuna' : 'lacunas' }}
      · {{ preenchidas }} preenchida{{ preenchidas === 1 ? '' : 's' }}
    </p>
  </header>
</template>

<style scoped>
.abertura {
  padding: clamp(40px, 9vh, 84px) 0 clamp(28px, 5vh, 48px);
  text-align: left;
}
.ab-num {
  font-family: var(--fonte-livro);
  font-weight: 700;
  font-size: clamp(64px, 12vw, 104px);
  line-height: 0.9;
  color: color-mix(in srgb, var(--tinta) 16%, transparent);
  user-select: none;
}
.ab-kicker {
  margin: 18px 0 0;
  font-family: var(--fonte-ui);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--resposta);
}
.ab-titulo {
  margin: 8px 0 0;
  font-family: var(--fonte-livro);
  font-weight: 600;
  font-size: clamp(26px, 4.5vw, 34px);
  line-height: 1.22;
  letter-spacing: -0.01em;
  color: var(--tinta);
  max-width: 24ch;
}
.ab-titulo:focus { outline: none; } /* foco programático de navegação, não interativo */
.ab-fio {
  width: 64px;
  height: 2px;
  margin-top: 22px;
  background: var(--pauta);
}
.ab-meta {
  margin: 14px 0 0;
  font-family: var(--fonte-ui);
  font-size: 12.5px;
  color: var(--tinta-2);
}
</style>
