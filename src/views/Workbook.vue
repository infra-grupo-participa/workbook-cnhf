<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import LogoCNHF from '../components/LogoCNHF.vue'
import ArrowLeft from '@lucide/vue/dist/esm/icons/arrow-left.mjs'
import Check from '@lucide/vue/dist/esm/icons/check.mjs'
import Download from '@lucide/vue/dist/esm/icons/download.mjs'
import { currentUser, getWorkbook, saveWorkbook, getLead } from '../data/api.js'
import { WORKBOOK, ANCORA } from '../data/workbook-content.js'
// book-print (gera o HTML/CSS do PDF) só é necessário ao baixar → import dinâmico

const router = useRouter()

// --- estado ---
const carregando = ref(true)
const respostas = reactive({})          // { "cap-1-l1": "texto" }
const secaoAtiva = ref(null)            // id da seção aberta; null = índice
const salvando = ref(false)
const salvoEm = ref(null)

// total de lacunas p/ progresso
const totalLacunas = WORKBOOK.reduce((a, s) => a + s.total_lacunas, 0)
const preenchidas = computed(() =>
  Object.values(respostas).filter((v) => (v || '').trim().length > 0).length
)
const pct = computed(() => totalLacunas ? Math.round((preenchidas.value / totalLacunas) * 100) : 0)

// preenchidas por seção (p/ o índice)
function preenchidasNaSecao(sec) {
  let n = 0
  for (const b of sec.blocos) {
    if (b.tipo === 'lacuna' || b.tipo === 'citacao-legal') {
      if ((respostas[b.id] || '').trim().length > 0) n++
    }
  }
  return n
}

const secao = computed(() => WORKBOOK.find((s) => s.id === secaoAtiva.value) || null)
const idxAtiva = computed(() => WORKBOOK.findIndex((s) => s.id === secaoAtiva.value))

function rotulo(sec) {
  return sec.tipo === 'capitulo' ? `Capítulo ${sec.numero}` : `Seção Extra ${sec.numero}`
}

// --- carga inicial ---
onMounted(async () => {
  const wb = await getWorkbook()
  Object.assign(respostas, wb.respostas || {})
  // retoma na última seção mexida, se houver
  if (wb.progresso && wb.progresso.ultima_secao && WORKBOOK.some(s => s.id === wb.progresso.ultima_secao)) {
    secaoAtiva.value = wb.progresso.ultima_secao
  }
  carregando.value = false
})

// --- autosave (debounce) ---
let timer = null
let pendente = false
function agendarSave() {
  pendente = true
  clearTimeout(timer)
  timer = setTimeout(persistir, 900)
}
async function persistir() {
  if (!pendente) return
  pendente = false
  salvando.value = true
  const progresso = { preenchidas: preenchidas.value, ultima_secao: secaoAtiva.value }
  const r = await saveWorkbook({ ...respostas }, progresso)
  salvando.value = false
  if (r.ok) salvoEm.value = new Date()
}
// salva ao sair da página / trocar de aba
function flush() { if (pendente) persistir() }
onBeforeUnmount(() => { clearTimeout(timer); flush() })
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flush)
  onBeforeUnmount(() => window.removeEventListener('beforeunload', flush))
}

function onInput(id, val) {
  respostas[id] = val
  agendarSave()
}

// auto-resize de textarea
function autoGrow(e) {
  const el = e.target
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

// baixar "meu workbook preenchido" em PDF (via janela de impressão do navegador)
const nomeAluno = ref('')
const gerandoPdf = ref(false)
async function baixarPdf() {
  flush()
  gerandoPdf.value = true
  try {
    if (!nomeAluno.value) {
      const l = await getLead(currentUser()); nomeAluno.value = l?.nome || ''
    }
    const { imprimeWorkbook } = await import('../data/book-print.js')
    imprimeWorkbook({ ...respostas }, nomeAluno.value)
  } finally {
    gerandoPdf.value = false
  }
}

function abrir(id) {
  secaoAtiva.value = id
  agendarSave()
  nextTick(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
}
function voltarIndice() { flush(); secaoAtiva.value = null; window.scrollTo({ top: 0 }) }
function irPara(delta) {
  const i = idxAtiva.value + delta
  if (i >= 0 && i < WORKBOOK.length) abrir(WORKBOOK[i].id)
}

// nº de linhas de um bloco (altura)
function linhasDe(b) {
  if (b.linhas && b.linhas > 0) return b.linhas
  return b.tamanho === 'paragrafo' ? 4 : b.tamanho === 'curto' ? 2 : 1
}
</script>

<template>
  <div class="shell">
    <header class="top card">
      <LogoCNHF :height="32" />
      <div class="acts">
        <span class="save" v-if="salvando">salvando…</span>
        <span class="save ok" v-else-if="salvoEm"><Check :size="14" :stroke-width="3" /> salvo</span>
        <button class="btn ghost" @click="router.push({ name: 'ambiente' })">Voltar ao ambiente</button>
      </div>
    </header>

    <!-- barra de progresso global -->
    <section class="card prog">
      <div class="prog-top">
        <div>
          <div class="eyebrow">Workbook · Holding Familiar</div>
          <strong>{{ preenchidas }} de {{ totalLacunas }} campos preenchidos</strong>
        </div>
        <div class="pct">{{ pct }}%</div>
      </div>
      <div class="bar"><div class="fill" :style="{ width: pct + '%' }" /></div>
    </section>

    <div v-if="carregando" class="card vazio">Carregando seu workbook…</div>

    <!-- ÍNDICE de capítulos -->
    <section v-else-if="!secao" class="card indice">
      <div class="eyebrow">Sumário</div>
      <h2>Caderno de acompanhamento</h2>
      <p class="muted intro">
        Preencha as lacunas durante a aula. Seu progresso é salvo automaticamente —
        pode fechar e voltar de onde parou.
      </p>
      <button class="btn ghost baixar" @click="baixarPdf" :disabled="gerandoPdf">
        <Download :size="16" /> {{ gerandoPdf ? 'Gerando…' : 'Baixar meu workbook em PDF' }}
      </button>
      <ul class="lista">
        <li v-for="s in WORKBOOK" :key="s.id">
          <button class="item" @click="abrir(s.id)">
            <span class="item-num">{{ rotulo(s) }}</span>
            <span class="item-tit">{{ s.titulo }}</span>
            <span class="item-badge" :class="{ full: preenchidasNaSecao(s) === s.total_lacunas && s.total_lacunas > 0 }">
              {{ preenchidasNaSecao(s) }}/{{ s.total_lacunas }}
            </span>
          </button>
        </li>
      </ul>
    </section>

    <!-- LEITOR de uma seção -->
    <section v-else class="card leitor">
      <button class="link voltar" @click="voltarIndice"><ArrowLeft :size="16" /> Sumário</button>
      <div class="cap-kicker">{{ rotulo(secao) }}</div>
      <h1 class="cap-titulo">{{ secao.titulo }}</h1>

      <div class="corpo">
        <template v-for="(b, i) in secao.blocos" :key="i">
          <span v-if="b.tipo === 'prosa'" class="prosa">{{ b.texto }} </span>

          <h3 v-else-if="b.tipo === 'subtitulo'" class="subtitulo">{{ b.texto }}</h3>

          <!-- lacuna inline curta -->
          <template v-else-if="b.tipo === 'lacuna' && b.tamanho === 'linha'">
            <input
              class="gap-inline"
              :value="respostas[b.id] || ''"
              @input="onInput(b.id, $event.target.value)"
              type="text" spellcheck="false" />
            <span v-if="b.sufixo" class="suf">{{ b.sufixo }} </span>
          </template>

          <!-- lacuna bloco (várias linhas) -->
          <div v-else-if="b.tipo === 'lacuna'" class="gap-block">
            <textarea
              :value="respostas[b.id] || ''"
              @input="onInput(b.id, $event.target.value); autoGrow($event)"
              :rows="linhasDe(b)"
              spellcheck="false"
              placeholder="…" />
            <span v-if="b.sufixo" class="suf">{{ b.sufixo }} </span>
          </div>

          <!-- citação legal -->
          <div v-else-if="b.tipo === 'citacao-legal'" class="legal">
            <span class="legal-rotulo">{{ b.rotulo }}</span>
            <textarea
              :value="respostas[b.id] || ''"
              @input="onInput(b.id, $event.target.value); autoGrow($event)"
              :rows="Math.max(2, linhasDe(b))"
              spellcheck="false"
              placeholder="Anote aqui a referência ditada…" />
            <span v-if="b.sufixo" class="suf">{{ b.sufixo }}</span>
          </div>
        </template>
      </div>

      <p v-if="secao.ancora" class="ancora">{{ ANCORA }}</p>

      <nav class="nav">
        <button class="btn" :disabled="idxAtiva === 0" @click="irPara(-1)">← Anterior</button>
        <button class="btn ghost" @click="voltarIndice">Sumário</button>
        <button class="btn primary" :disabled="idxAtiva === WORKBOOK.length - 1" @click="irPara(1)">Próximo →</button>
      </nav>
    </section>
  </div>
</template>

<style scoped>
.shell { position: relative; z-index: 1; max-width: 820px; margin: 0 auto; padding: 18px 18px 70px; display: flex; flex-direction: column; gap: 16px; }
.top { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; }
.acts { display: flex; align-items: center; gap: 10px; }
.save { font-size: 12.5px; color: var(--ink-3); display: inline-flex; align-items: center; gap: 5px; }
.save.ok { color: var(--ok); }

/* progresso */
.prog { padding: 16px 20px; }
.prog-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.prog-top strong { display: block; font-size: 15px; margin-top: 3px; }
.pct { font-size: 22px; font-weight: 800; color: var(--accent); }
.bar { height: 8px; border-radius: 999px; background: var(--stroke); overflow: hidden; }
.fill { height: 100%; background: var(--accent); border-radius: 999px; transition: width .3s ease; }

.vazio { padding: 40px; text-align: center; color: var(--ink-2); }

/* índice */
.indice { padding: 24px 26px; }
.indice h2 { font-size: 22px; margin: 6px 0 8px; }
.intro { font-size: 14px; margin: 0 0 14px; max-width: 560px; }
.baixar { margin-bottom: 18px; }
.lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.item { width: 100%; display: flex; align-items: center; gap: 14px; padding: 14px 16px; text-align: left;
  background: var(--surface); border: 1px solid var(--stroke); border-radius: var(--radius-sm); cursor: pointer;
  transition: border-color .15s, transform .1s; }
.item:hover { border-color: var(--accent-line); }
.item:active { transform: scale(.995); }
.item-num { flex: 0 0 auto; min-width: 96px; font-size: 11px; font-weight: 800; letter-spacing: .04em;
  text-transform: uppercase; color: var(--accent); }
.item-tit { flex: 1; font-size: 14.5px; font-weight: 600; color: var(--ink); line-height: 1.35; }
.item-badge { flex: 0 0 auto; font-size: 12px; font-weight: 700; color: var(--ink-3);
  background: var(--bg); border: 1px solid var(--stroke); border-radius: 999px; padding: 3px 10px; }
.item-badge.full { color: var(--ok); border-color: rgba(47,191,113,.4); background: rgba(47,191,113,.10); }

/* leitor */
.leitor { padding: 24px 30px 30px; }
.voltar { display: inline-flex; align-items: center; gap: 5px; margin-bottom: 16px; }
.cap-kicker { font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); }
.cap-titulo { font-size: 25px; line-height: 1.2; margin: 6px 0 20px; padding-bottom: 14px; border-bottom: 2px solid var(--accent-line); }
.corpo { font-size: 16px; line-height: 2.05; text-align: justify; }
.prosa { }
.subtitulo { display: block; font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em;
  color: var(--accent); margin: 22px 0 10px; text-align: left; }

/* campos */
.gap-inline { display: inline; width: auto; min-width: 150px; padding: 1px 8px; margin: 0 2px;
  font: inherit; font-size: 15.5px; color: var(--accent); font-weight: 600;
  background: var(--accent-soft); border: none; border-bottom: 1.5px solid var(--accent-line);
  border-radius: 4px 4px 0 0; }
.gap-inline:focus { outline: none; background: var(--accent-soft); border-bottom-color: var(--accent); box-shadow: none; }
.gap-block { display: block; margin: 10px 0; }
.gap-block textarea, .legal textarea { display: block; width: 100%; font: inherit; font-size: 15.5px;
  line-height: 1.7; color: var(--accent); font-weight: 500; padding: 10px 12px;
  background: var(--accent-soft); border: 1px solid var(--accent-line); border-radius: var(--radius-sm);
  resize: none; overflow: hidden; }
.gap-block textarea:focus, .legal textarea:focus { outline: none; border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft); }
.suf { color: var(--ink); }

.legal { display: block; margin: 14px 0; padding: 12px 14px; background: var(--bg);
  border-left: 3px solid var(--accent); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; }
.legal-rotulo { display: block; font-size: 11px; font-weight: 800; letter-spacing: .06em;
  text-transform: uppercase; color: var(--accent); margin-bottom: 8px; }

.ancora { margin-top: 26px; text-align: center; font-style: italic; font-size: 15px; color: var(--accent); }

.nav { display: flex; gap: 10px; justify-content: space-between; margin-top: 28px;
  padding-top: 18px; border-top: 1px solid var(--stroke); }
@media (max-width: 560px) {
  .leitor { padding: 20px 18px 24px; }
  .corpo { font-size: 15px; }
  .item-num { min-width: 78px; }
}
</style>
