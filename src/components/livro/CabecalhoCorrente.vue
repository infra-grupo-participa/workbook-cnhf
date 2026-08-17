<script setup>
import { computed } from 'vue'
import ArrowLeft from '@lucide/vue/dist/esm/icons/arrow-left.mjs'
import PainelLeitura from './PainelLeitura.vue'

/* Cabeçalho corrente — fino, sticky, não compete com o texto.
   Carrega: onde estou (capítulo), quanto falta (fio de progresso) e o
   estado de salvamento COM HONESTIDADE (offline ≠ salvo no servidor). */
const props = defineProps({
  modo: { type: String, default: 'indice' },   // 'indice' | 'leitura'
  rotulo: { type: String, default: '' },       // "Capítulo III"
  titulo: { type: String, default: '' },       // "Montagem da Holding…"
  pct: { type: Number, default: 0 },           // progresso global 0–100
  status: { type: String, default: 'salvo' },  // store.status
  pendentes: { type: Number, default: 0 },
  ultimaSync: { type: Date, default: null },
})
defineEmits(['voltar'])

const statusTexto = computed(() => {
  if (props.status === 'salvando') return 'salvando…'
  if (props.status === 'offline') {
    return props.pendentes > 0
      ? 'salvo neste aparelho · aguardando rede'
      : 'offline · tudo sincronizado'
  }
  if (props.status === 'erro') return 'falha ao sincronizar — verifique sua sessão'
  return props.pendentes > 0 ? 'salvando…' : 'salvo'
})
const statusTitulo = computed(() =>
  props.ultimaSync
    ? 'Última sincronização: ' + props.ultimaSync.toLocaleTimeString('pt-BR')
    : 'Ainda não sincronizado nesta sessão')
</script>

<template>
  <header class="cc">
    <div class="cc-in">
      <button class="cc-volta" @click="$emit('voltar')">
        <ArrowLeft :size="15" aria-hidden="true" />
        <span>{{ modo === 'leitura' ? 'Sumário' : 'Ambiente' }}</span>
      </button>

      <div class="cc-meio">
        <span class="cc-cap">{{ rotulo }}</span>
        <span v-if="titulo" class="cc-tit">· {{ titulo }}</span>
      </div>

      <div class="cc-dir">
        <span class="cc-status" :data-s="status" :title="statusTitulo" aria-live="polite">
          <span class="cc-ponto" aria-hidden="true"></span>
          <span class="cc-status-txt">{{ statusTexto }}</span>
        </span>
        <span class="cc-pct" aria-hidden="true">{{ pct }}%</span>
        <PainelLeitura />
      </div>
    </div>
    <div class="cc-fio" role="progressbar" :aria-valuenow="pct" aria-valuemin="0"
      aria-valuemax="100" :aria-label="`Progresso do workbook: ${pct} por cento`">
      <div class="cc-fio-fill" :style="{ width: pct + '%' }"></div>
    </div>
  </header>
</template>

<style scoped>
.cc {
  position: sticky;
  top: 0;
  z-index: 30;
  background: color-mix(in srgb, var(--papel) 88%, transparent);
  backdrop-filter: blur(10px) saturate(140%);
  border-bottom: 1px solid color-mix(in srgb, var(--pauta) 32%, transparent);
  font-family: var(--fonte-ui);
}
.cc-in {
  max-width: 1080px;
  margin: 0 auto;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 46px;
}
.cc-volta {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--tinta-2);
  background: none;
  border: none;
  padding: 8px 6px;
  margin-left: -6px;
  cursor: pointer;
  border-radius: 6px;
  white-space: nowrap;
}
.cc-volta:hover { color: var(--tinta); background: var(--resposta-bg); }
.cc-meio {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 6px;
  overflow: hidden;
}
.cc-cap {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--tinta);
  white-space: nowrap;
}
.cc-tit {
  font-size: 12px;
  color: var(--tinta-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cc-dir { display: flex; align-items: center; gap: 12px; }
.cc-pct {
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--tinta-2);
}
.cc-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--tinta-2);
  white-space: nowrap;
}
.cc-ponto {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--ok);
  flex: 0 0 auto;
}
.cc-status[data-s='salvando'] .cc-ponto { background: var(--accent); animation: cc-pulso 1.1s ease-in-out infinite; }
.cc-status[data-s='offline'] .cc-ponto { background: var(--warn); }
.cc-status[data-s='erro'] .cc-ponto { background: var(--bad); }
@keyframes cc-pulso { 50% { opacity: 0.35; } }
.cc-fio { height: 2px; background: color-mix(in srgb, var(--pauta) 22%, transparent); }
.cc-fio-fill { height: 100%; background: var(--cta-gradiente); transition: width 0.3s ease; }

@media (max-width: 720px) {
  .cc-tit { display: none; }
  .cc-status-txt {
    position: absolute; width: 1px; height: 1px; overflow: hidden;
    clip: rect(0 0 0 0); white-space: nowrap;               /* sr-only: o ponto colorido fica, o texto vai pro leitor de tela */
  }
  .cc-status { position: relative; }
  .cc-dir { gap: 9px; }
}
</style>
