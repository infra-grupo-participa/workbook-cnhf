<script setup>
/* Mapa de lacunas — minimapa lateral da seção: cada ponto é uma lacuna
   (preenchida = tinta, vazia = vazada), clicável. Responde "quanto falta"
   de um jeito que barra de progresso nenhuma responde. Desktop only. */
defineProps({
  itens: { type: Array, required: true },   // [{ id, n, cheia }]
  ativa: { type: String, default: null },
  preenchidas: { type: Number, default: 0 },
})
defineEmits(['ir'])
</script>

<template>
  <nav class="mapa" aria-label="Mapa de lacunas da seção">
    <span class="mapa-num" aria-hidden="true">{{ preenchidas }}/{{ itens.length }}</span>
    <ol class="mapa-lista">
      <li v-for="it in itens" :key="it.id">
        <button
          class="mapa-ponto"
          :class="{ cheia: it.cheia, ativa: ativa === it.id }"
          :aria-label="`Ir para lacuna ${it.n} de ${itens.length}` + (it.cheia ? ' (preenchida)' : ' (vazia)')"
          :aria-current="ativa === it.id ? 'true' : undefined"
          @click="$emit('ir', it.id)"></button>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.mapa {
  position: fixed;
  right: max(14px, calc((100vw - 68ch) / 2 - 90px));
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  display: none;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-family: var(--fonte-ui);
}
@media (min-width: 1100px) { .mapa { display: flex; } }
.mapa-num {
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--tinta-2);
}
.mapa-lista {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 62vh;
  overflow-y: auto;
  scrollbar-width: none;
}
.mapa-lista::-webkit-scrollbar { display: none; }
.mapa-ponto {
  display: block;
  width: 18px;
  height: 14px;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  position: relative;
}
.mapa-ponto::after {
  content: '';
  position: absolute;
  inset: 3px 5px;
  border-radius: 50%;
  border: 1.5px solid var(--pauta);
  background: transparent;
  transition: background 0.15s, border-color 0.15s, transform 0.15s;
}
.mapa-ponto.cheia::after { background: var(--resposta); border-color: var(--resposta); }
.mapa-ponto.ativa::after { transform: scale(1.35); border-color: var(--accent); }
.mapa-ponto:hover::after { transform: scale(1.35); }
</style>
