<script setup>
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { prefs, fontesProntas } from './usePreferencias.js'

/* Lacuna de bloco — área pautada (linhas de caderno), não caixa de
   formulário. Na TELA começa compacta (1–2 pautas) e cresce com o que
   se digita; as `linhas` completas do schema são requisito do IMPRESSO
   (lá se escreve à mão — o book-print do Agente D as respeita).
   O sufixo de pontuação é ancorado ao FIM DO TEXTO digitado por um
   "fantasma" sobreposto que espelha o conteúdo do textarea — vazio,
   ele repousa no fim da primeira pauta. */
const props = defineProps({
  modelValue: { type: String, default: '' },
  bloco: { type: Object, required: true },  // { id, linhas, tamanho… }
  meta: { type: Object, default: null },
  placeholder: { type: String, default: '' },
  sufixo: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const campo = ref(null)

// compacta na tela: 1–2 pautas (o campo cresce sozinho ao digitar)
const linhasIniciais = computed(() =>
  Math.min(Math.max(props.bloco.linhas || 1, 1), 2))
// resposta esperada longa (no impresso) e ainda vazia → sinal discreto
const esperaLonga = computed(() =>
  !(props.modelValue || '').trim() && (props.bloco.linhas || 1) > 2)

const rotuloAria = computed(() =>
  props.meta
    ? `Lacuna ${props.meta.n} de ${props.meta.total} — ${props.meta.rotulo}`
    : 'Lacuna para preencher')

function crescer() {
  const el = campo.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}
onMounted(crescer)
watch(() => props.modelValue, () => nextTick(crescer))
// tamanho/entrelinha/fonte (e a chegada da Literata) alteram a altura → recalcula
watch(() => [prefs.fs, prefs.lh, prefs.fonte, fontesProntas.value], () => nextTick(crescer))
</script>

<template>
  <span class="lac-bloco">
    <textarea
      ref="campo"
      class="lac-area"
      :class="{ 'com-sufixo': !!sufixo }"
      :value="modelValue || ''"
      :data-lacuna="bloco.id"
      :aria-label="rotuloAria"
      :rows="linhasIniciais"
      :placeholder="placeholder"
      spellcheck="false"
      autocomplete="off"
      @input="emit('update:modelValue', $event.target.value); crescer()" />
    <!-- fantasma: texto transparente + pontuação visível logo após a última palavra -->
    <span v-if="sufixo" class="lac-ghost" :class="{ vazia: !(modelValue || '').length }"
      aria-hidden="true"><span class="ghost-texto">{{ modelValue || '' }}</span><span
        class="lac-suf">{{ sufixo }}</span></span>
    <span v-if="esperaLonga" class="lac-mais" aria-hidden="true">…</span>
  </span>
</template>

<style scoped>
.lac-bloco { display: block; position: relative; margin: 0.4em 0 0.2em; }
.lac-area {
  display: block;
  width: 100%;
  font: inherit;
  font-style: italic;
  letter-spacing: 0.01em;
  line-height: var(--lh-livro);
  color: var(--resposta);
  caret-color: var(--resposta);
  padding: 0 2px;
  border: 0;
  border-radius: 2px;
  resize: none;
  overflow: hidden;
  background-color: transparent;
  /* pautas de caderno: uma linha fina no pé de cada linha de texto */
  background-image: linear-gradient(
    to top,
    var(--pauta-suave) 1px,
    transparent 1px
  );
  background-size: 100% calc(var(--lh-livro) * 1em);
  background-attachment: local;
  transition: background-color 0.15s;
  /* caminhos nativos de scroll nunca escondem a lacuna sob o cabeçalho
     sticky nem sob a barra inferior */
  scroll-margin-top: 84px;
  scroll-margin-bottom: 110px;
}
.lac-area.com-sufixo { padding-right: 1.4ch; }
.lac-area::placeholder { color: var(--tinta-2); opacity: 0.55; font-style: italic; }
.lac-area:focus { outline: none; background-color: var(--resposta-bg); }

/* fantasma com métricas idênticas às do textarea → quebra de linha igual */
.lac-ghost {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  font: inherit;
  font-style: italic;
  letter-spacing: 0.01em;
  line-height: var(--lh-livro);
  padding: 0 1.4ch 0 2px;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}
.ghost-texto { color: transparent; }        /* só ocupa o espaço do texto real */
.lac-suf { color: var(--tinta); font-style: normal; }
/* vazia: a pontuação repousa no fim da PRIMEIRA pauta */
.lac-ghost.vazia .lac-suf { position: absolute; right: 2px; top: 0; }

/* resposta longa ainda vazia: reticência discreta no fim da última pauta */
.lac-mais {
  position: absolute;
  right: 1.6ch;
  bottom: 0;
  line-height: var(--lh-livro);
  color: var(--pauta);
  pointer-events: none;
}
</style>
