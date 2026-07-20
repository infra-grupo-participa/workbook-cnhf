<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LogoCNHF from '../components/LogoCNHF.vue'
import { SURVEY } from '../data/survey-schema.js'
import { currentUser, submitSurvey } from '../data/api.js'

const route = useRoute()
const router = useRouter()
const travado = route.query.motivo === 'trava'

const respostas = ref({})
const passo = ref(0)          // pergunta atual (0-indexed) — uma por etapa
const enviando = ref(false)
const erro = ref('')

const total = SURVEY.length
const atual = computed(() => SURVEY[passo.value])
const ultima = computed(() => passo.value === total - 1)

const respondida = computed(() => {
  const v = respostas.value[atual.value.id]
  return v != null && String(v).trim().length > 0
})

function avancar() {
  erro.value = ''
  if (!respondida.value) { erro.value = 'Responda para continuar.'; return }
  if (ultima.value) return finalizar()
  passo.value++
}
function voltar() { erro.value = ''; if (passo.value > 0) passo.value-- }

// radio: seleciona e já avança (estilo etapa por etapa)
function escolher(op) {
  respostas.value[atual.value.id] = op
  erro.value = ''
  setTimeout(() => { if (!ultima.value) passo.value++; }, 220)
}

async function finalizar() {
  erro.value = ''
  const faltando = SURVEY.find((q) => q.obrigatoria && !(respostas.value[q.id] && String(respostas.value[q.id]).trim()))
  if (faltando) { erro.value = 'Ainda falta responder alguma pergunta.'; passo.value = SURVEY.indexOf(faltando); return }
  enviando.value = true
  await submitSurvey(currentUser(), { ...respostas.value })
  enviando.value = false
  router.push({ name: 'ambiente' })
}
</script>

<template>
  <div class="wrap">
    <header class="top">
      <LogoCNHF :height="32" />
      <span class="muted" style="font-size:12.5px">{{ currentUser() }}</span>
    </header>

    <div class="card box">
      <div class="eyebrow">Pesquisa de qualificação · pergunta {{ passo + 1 }} de {{ total }}</div>

      <div class="progresso">
        <div class="barra"><div class="fill" :style="{ width: ((passo + (respondida ? 1 : 0)) / total * 100) + '%' }" /></div>
      </div>

      <div v-if="travado && passo === 0" class="alert warn">
        O seu acesso ao ambiente do aluno é liberado assim que você responde esta pesquisa rápida. É só uma vez.
      </div>

      <!-- pergunta única da etapa -->
      <Transition name="fade" mode="out-in">
        <div :key="atual.id" class="q">
          <div class="q-label">{{ atual.label }}</div>

          <div v-if="atual.tipo === 'radio'" class="opcoes">
            <button
              v-for="op in atual.opcoes" :key="op" type="button"
              class="op" :class="{ sel: respostas[atual.id] === op }"
              @click="escolher(op)"
            >{{ op }}</button>
          </div>

          <textarea
            v-else v-model="respostas[atual.id]" :placeholder="atual.placeholder"
            @keydown.ctrl.enter="avancar" @keydown.meta.enter="avancar" autofocus
          />
        </div>
      </Transition>

      <div v-if="erro" class="alert bad" style="margin-top:14px">{{ erro }}</div>

      <div class="nav">
        <button class="btn ghost" :disabled="passo === 0" @click="voltar">Voltar</button>
        <button class="btn primary" :disabled="enviando" @click="avancar">
          {{ enviando ? 'Liberando...' : (ultima ? 'Finalizar e liberar meu workbook' : 'Continuar') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wrap { position: relative; z-index: 1; max-width: 620px; margin: 0 auto; padding: 24px 18px 60px; }
.top { display: flex; align-items: center; justify-content: space-between; color: var(--ink); margin-bottom: 18px; }
.box { padding: 30px 32px; min-height: 380px; display: flex; flex-direction: column; }
.progresso { margin: 12px 0 20px; }
.barra { height: 8px; border-radius: 999px; background: var(--stroke); overflow: hidden; }
.fill { height: 100%; background: var(--accent); border-radius: 999px; transition: width .3s ease; }
.q { flex: 1; }
.q-label { font-size: 21px; font-weight: 700; line-height: 1.35; margin-bottom: 20px; }
.opcoes { display: flex; flex-direction: column; gap: 10px; }
.op {
  text-align: left; font: inherit; font-size: 15px; color: var(--ink);
  padding: 15px 18px; border: 1px solid var(--stroke-strong); border-radius: var(--radius-sm);
  background: var(--surface); cursor: pointer; transition: border-color .12s, background .12s, transform .08s;
}
.op:hover { border-color: var(--accent-line); }
.op:active { transform: scale(.99); }
.op.sel { border-color: var(--accent); background: var(--accent-soft); font-weight: 600; }
textarea { min-height: 130px; font-size: 15px; }
.nav { display: flex; justify-content: space-between; gap: 12px; margin-top: 24px; }

.fade-enter-active, .fade-leave-active { transition: opacity .18s ease, transform .18s ease; }
.fade-enter-from { opacity: 0; transform: translateX(12px); }
.fade-leave-to { opacity: 0; transform: translateX(-12px); }
</style>
