<script setup>
import { nextTick, ref, watch } from 'vue'
import { prefs } from './usePreferencias.js'

/* Painel de leitura — popover com tamanho, entrelinha, fonte, tema e
   justificação. Persistido via usePreferencias. */
const aberto = ref(false)
const gatilho = ref(null)
const pop = ref(null)

function alternar() { aberto.value = !aberto.value }
function fechar() {
  aberto.value = false
  nextTick(() => gatilho.value && gatilho.value.focus())
}
watch(aberto, (v) => {
  if (v) nextTick(() => {
    const el = pop.value && pop.value.querySelector('button')
    if (el) el.focus()
  })
})

const TEMAS = [
  { id: 'claro', rotulo: 'Claro' },
  { id: 'sepia', rotulo: 'Sépia' },
  { id: 'escuro', rotulo: 'Escuro' },
]
</script>

<template>
  <div class="pl">
    <button
      ref="gatilho"
      class="pl-gatilho"
      :aria-expanded="aberto"
      aria-haspopup="dialog"
      aria-label="Ajustes de leitura"
      title="Ajustes de leitura"
      @click="alternar">Aa</button>

    <div v-if="aberto" class="pl-fundo" aria-hidden="true" @click="fechar"></div>

    <div v-if="aberto" ref="pop" class="pl-pop" role="dialog"
      aria-label="Ajustes de leitura" @keydown.esc.stop="fechar">
      <div class="pl-grupo" role="group" aria-label="Tamanho do texto">
        <span class="pl-rotulo">Tamanho</span>
        <div class="pl-seg">
          <button v-for="n in [1, 2, 3]" :key="'fs' + n"
            :aria-pressed="prefs.fs === n"
            :aria-label="['Texto menor', 'Texto médio', 'Texto maior'][n - 1]"
            :style="{ fontSize: [12, 14.5, 17][n - 1] + 'px' }"
            @click="prefs.fs = n">A</button>
        </div>
      </div>

      <div class="pl-grupo" role="group" aria-label="Entrelinha">
        <span class="pl-rotulo">Entrelinha</span>
        <div class="pl-seg">
          <button v-for="(r, i) in ['Compacta', 'Normal', 'Arejada']" :key="'lh' + i"
            :aria-pressed="prefs.lh === i + 1" @click="prefs.lh = i + 1">{{ r }}</button>
        </div>
      </div>

      <div class="pl-grupo" role="group" aria-label="Fonte do corpo">
        <span class="pl-rotulo">Fonte</span>
        <div class="pl-seg">
          <button :aria-pressed="prefs.fonte === 'serifa'" class="pl-serifa"
            @click="prefs.fonte = 'serifa'">Serifa</button>
          <button :aria-pressed="prefs.fonte === 'sans'"
            @click="prefs.fonte = 'sans'">Sans</button>
        </div>
      </div>

      <div class="pl-grupo" role="group" aria-label="Tema de cores">
        <span class="pl-rotulo">Tema</span>
        <div class="pl-seg">
          <button v-for="t in TEMAS" :key="t.id" class="pl-tema" :data-tema="t.id"
            :aria-pressed="prefs.tema === t.id" @click="prefs.tema = t.id">
            <span class="pl-bola" aria-hidden="true"></span>{{ t.rotulo }}
          </button>
        </div>
      </div>

      <div class="pl-grupo" role="group" aria-label="Alinhamento">
        <span class="pl-rotulo">Justificar</span>
        <div class="pl-seg">
          <button :aria-pressed="!prefs.justificar" @click="prefs.justificar = false">Não</button>
          <button :aria-pressed="prefs.justificar" @click="prefs.justificar = true">Sim</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pl { position: relative; display: inline-flex; }
.pl-gatilho {
  font-family: var(--fonte-livro);
  font-size: 14px;
  font-weight: 600;
  color: var(--tinta);
  background: transparent;
  border: 1px solid var(--pauta-suave);
  border-radius: 8px;
  min-width: 36px;
  min-height: 32px;
  padding: 3px 9px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.pl-gatilho:hover { border-color: var(--pauta); background: var(--resposta-bg); }
.pl-fundo { position: fixed; inset: 0; z-index: 39; }
.pl-pop {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 40;
  width: 264px;
  padding: 14px 16px;
  background: var(--papel);
  border: 1px solid var(--pauta-suave);
  border-radius: 12px;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-family: var(--fonte-ui);
}
.pl-grupo { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.pl-rotulo { font-size: 12px; font-weight: 700; color: var(--tinta-2); }
.pl-seg { display: flex; gap: 4px; }
.pl-seg button {
  font-family: var(--fonte-ui);
  font-size: 12px;
  font-weight: 600;
  color: var(--tinta);
  background: transparent;
  border: 1px solid var(--pauta-suave);
  border-radius: 7px;
  min-height: 30px;
  padding: 4px 9px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: background 0.15s, border-color 0.15s;
}
.pl-seg button:hover { border-color: var(--pauta); }
.pl-seg button[aria-pressed='true'] {
  background: var(--resposta);
  border-color: var(--resposta);
  color: var(--papel);
}
.pl-seg button.pl-serifa { font-family: var(--fonte-livro); } /* demonstra a própria serifa */
.pl-bola { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--pauta); }
.pl-tema[data-tema='claro'] .pl-bola { background: #fcfbf9; }
.pl-tema[data-tema='sepia'] .pl-bola { background: #f2e9d8; }
.pl-tema[data-tema='escuro'] .pl-bola { background: #191612; }
@media (max-width: 560px) {
  .pl-pop { position: fixed; top: 54px; right: 10px; left: 10px; width: auto; }
}
</style>
