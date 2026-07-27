<script setup>
/* SUMÁRIO VIVO — o índice do próprio livro como instrumento de progresso.
   Cada linha é um capítulo; a linha pontilhada de índice (leader) É o fio
   de progresso do capítulo: os pontos preenchidos ganham a cor de resposta.
   Capítulo completo recebe o ✓; onde o aluno parou, a fita de leitura. */
import { computed } from 'vue'
import Check from '@lucide/vue/dist/esm/icons/check.mjs'

const props = defineProps({
  itens: { type: Array, required: true },      // [{ sec, cheias, total }]
  ultimaSecao: { type: String, default: null } // id da seção onde o aluno parou
})
defineEmits(['abrir'])

const linhas = computed(() => props.itens.map(({ sec, cheias, total }) => ({
  id: sec.id,
  num: sec.tipo === 'capitulo' ? sec.romano : '§' + sec.numero,
  rotulo: sec.tipo === 'capitulo' ? `Capítulo ${sec.romano}` : `Seção Extra ${sec.numero}`,
  titulo: sec.titulo,
  cheias, total,
  pct: total ? Math.round((cheias / total) * 100) : 0,
  completo: total > 0 && cheias === total,
  atual: sec.id === props.ultimaSecao,
})))
</script>

<template>
  <ol class="sv" role="list">
    <li v-for="l in linhas" :key="l.id">
      <button type="button" class="sv-linha" :class="{ atual: l.atual }"
        :aria-label="`${l.rotulo} — ${l.titulo}. ${l.cheias} de ${l.total} lacunas preenchidas${l.completo ? ', capítulo completo' : ''}${l.atual ? '. Você parou aqui' : ''}. Abrir no livro`"
        :aria-current="l.atual ? 'true' : undefined"
        @click="$emit('abrir', l.id)">
        <span class="sv-fita" aria-hidden="true"></span>
        <span class="sv-num" aria-hidden="true">{{ l.num }}</span>
        <span class="sv-tit" aria-hidden="true">{{ l.titulo }}</span>
        <span class="sv-leader" aria-hidden="true">
          <span class="sv-leader-fill" :style="{ width: l.pct + '%' }"></span>
        </span>
        <span class="sv-frac" aria-hidden="true">
          <template v-if="l.completo"><Check class="sv-check" :size="14" :stroke-width="3" /></template>
          <template v-else>{{ l.cheias }}<span class="sv-de">/{{ l.total }}</span></template>
        </span>
      </button>
    </li>
  </ol>
</template>

<style scoped>
.sv { list-style: none; margin: 0; padding: 0; }
.sv li + li { border-top: 1px solid var(--stroke); }

.sv-linha {
  display: flex;
  align-items: baseline;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  padding: 12px 10px 12px 4px;
  border: none;
  background: none;
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
  position: relative;
  border-radius: 6px;
  transition: background 0.12s ease;
}
.sv-linha:hover { background: var(--accent-soft); }

/* fita de leitura: marca de onde o aluno parou, como a fita do livro físico */
.sv-fita {
  position: absolute;
  left: -14px; top: 0;
  width: 4px; height: 100%;
  border-radius: 0 0 3px 3px;
  background: transparent;
}
.sv-linha.atual .sv-fita { background: var(--resposta); }

.sv-num {
  flex: 0 0 34px;
  font-family: var(--fonte-livro);
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: lining-nums;
  color: var(--ink-2);
  text-align: right;
}
.sv-linha.atual .sv-num, .sv-linha:hover .sv-num { color: var(--resposta); }

.sv-tit {
  font-family: var(--fonte-livro);
  font-size: 15.5px;
  line-height: 1.35;
  flex-shrink: 1;
  min-width: 0;
}

/* a linha pontilhada de índice, que também é a barra de progresso */
.sv-leader {
  flex: 1 1 40px;
  align-self: center;
  position: relative;
  height: 4px;
  min-width: 28px;
  background-image: radial-gradient(circle at 2px 50%, var(--pauta-suave) 1.4px, transparent 1.7px);
  background-size: 8px 4px;
  background-repeat: repeat-x;
}
.sv-leader-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background-image: radial-gradient(circle at 2px 50%, var(--resposta) 1.7px, transparent 2px);
  background-size: 8px 4px;
  background-repeat: repeat-x;
  transition: width 0.3s ease;
}

.sv-frac {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 46px;
  font-family: var(--fonte-ui);
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}
.sv-de { font-weight: 600; color: var(--ink-2); }
.sv-check { color: var(--resposta); }

@media (max-width: 560px) {
  .sv-linha { gap: 9px; padding-left: 8px; }
  .sv-fita { left: 0; width: 3px; }
  .sv-num { flex-basis: 26px; font-size: 14px; }
  .sv-tit { font-size: 14.5px; }
  .sv-leader { min-width: 16px; }
}
</style>
