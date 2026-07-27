<script setup>
import { computed } from 'vue'

/* Estado de sincronização — MESMA linguagem do cabeçalho do livro
   (CabecalhoCorrente): honestidade em primeiro lugar. "Offline com
   pendências" nunca vira "salvo"; erro sugere o próximo passo. */
const props = defineProps({
  status: { type: String, default: 'salvo' },   // 'salvo'|'salvando'|'offline'|'erro'
  pendentes: { type: Number, default: 0 },
  ultimaSync: { type: Date, default: null },
})

const texto = computed(() => {
  if (props.status === 'salvando') return 'salvando…'
  if (props.status === 'offline') {
    return props.pendentes > 0
      ? 'salvo neste aparelho · aguardando rede'
      : 'offline · tudo sincronizado'
  }
  if (props.status === 'erro') return 'falha ao sincronizar — verifique sua sessão'
  return props.pendentes > 0 ? 'salvando…' : 'salvo'
})
const detalhe = computed(() =>
  props.ultimaSync
    ? 'Última sincronização: ' + props.ultimaSync.toLocaleTimeString('pt-BR')
    : 'Ainda não sincronizado nesta sessão')
</script>

<template>
  <span class="ss" :data-s="status" :title="detalhe" aria-live="polite" role="status">
    <span class="ss-ponto" aria-hidden="true"></span>
    <span class="ss-txt">{{ texto }}</span>
  </span>
</template>

<style scoped>
.ss {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: var(--fonte-ui);
  font-size: 12px;
  color: var(--ink-2);
  white-space: nowrap;
}
.ss-ponto {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--ok);
  flex: 0 0 auto;
}
.ss[data-s='salvando'] .ss-ponto { background: var(--accent); animation: ss-pulso 1.1s ease-in-out infinite; }
.ss[data-s='offline'] .ss-ponto { background: var(--warn); }
.ss[data-s='erro'] .ss-ponto { background: var(--bad); }
@keyframes ss-pulso { 50% { opacity: 0.35; } }
</style>
