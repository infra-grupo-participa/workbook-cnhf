<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Download from '@lucide/vue/dist/esm/icons/download.mjs'
import { currentUser, getLead } from '../data/api.js'
import { store } from '../data/store.js'
import { WORKBOOK, ANCORA } from '../data/workbook-content.js'
import { prefs } from '../components/livro/usePreferencias.js'
import { criarDitado } from '../components/livro/useDitado.js'
import CabecalhoCorrente from '../components/livro/CabecalhoCorrente.vue'
import AberturaCapitulo from '../components/livro/AberturaCapitulo.vue'
import LacunaInline from '../components/livro/LacunaInline.vue'
import LacunaBloco from '../components/livro/LacunaBloco.vue'
import CitacaoLegal from '../components/livro/CitacaoLegal.vue'
import MapaLacunas from '../components/livro/MapaLacunas.vue'
import BarraLacunas from '../components/livro/BarraLacunas.vue'
// book-print (HTML/CSS do PDF) só ao baixar → import dinâmico

const router = useRouter()

// ------------------------------------------------------------
// metadados das lacunas (ordem de leitura por seção)
// ------------------------------------------------------------
function rotulo(sec) {
  return sec.tipo === 'capitulo' ? `Capítulo ${sec.romano}` : `Seção Extra ${sec.numero}`
}
function idsDaSecao(sec) {
  const ids = []
  for (const p of sec.paragrafos) {
    if (p.tipo === 'paragrafo') {
      for (const b of p.blocos) if (b.tipo === 'lacuna') ids.push(b.id)
    } else if (p.tipo === 'citacao-legal') {
      ids.push(p.id)
    }
  }
  return ids
}
const IDS_POR_SECAO = Object.fromEntries(WORKBOOK.map((s) => [s.id, idsDaSecao(s)]))
const META = {}
for (const sec of WORKBOOK) {
  const ids = IDS_POR_SECAO[sec.id]
  ids.forEach((id, i) => {
    META[id] = { n: i + 1, total: ids.length, rotulo: rotulo(sec), secao: sec.id }
  })
}
const TOTAL_LACUNAS = WORKBOOK.reduce((a, s) => a + s.total_lacunas, 0)

// ------------------------------------------------------------
// estado
// ------------------------------------------------------------
const carregando = ref(true)
const secaoAtiva = ref(null)          // id da seção aberta; null = sumário
const lacunaAtiva = ref(null)         // id da lacuna focada agora
const ultimaLacuna = ref(null)        // última focada (alvo do ditado)
const corpoEl = ref(null)
const aberturaEl = ref(null)

const secao = computed(() => WORKBOOK.find((s) => s.id === secaoAtiva.value) || null)
const idxAtiva = computed(() => WORKBOOK.findIndex((s) => s.id === secaoAtiva.value))
const secAnterior = computed(() => (idxAtiva.value > 0 ? WORKBOOK[idxAtiva.value - 1] : null))
const secProxima = computed(() =>
  idxAtiva.value >= 0 && idxAtiva.value < WORKBOOK.length - 1 ? WORKBOOK[idxAtiva.value + 1] : null)

function preenchidasNaSecao(sec) {
  return IDS_POR_SECAO[sec.id].filter((id) => (store.valores[id] || '').trim().length > 0).length
}
const pct = computed(() =>
  TOTAL_LACUNAS ? Math.round((store.progresso.preenchidas / TOTAL_LACUNAS) * 100) : 0)

const itensMapa = computed(() => {
  if (!secao.value) return []
  return IDS_POR_SECAO[secao.value.id].map((id, i) => ({
    id, n: i + 1, cheia: (store.valores[id] || '').trim().length > 0,
  }))
})

// ------------------------------------------------------------
// carga inicial — store local-first (Agente C): grava cada tecla no
// IndexedDB na hora e sincroniza com merge por campo em segundo plano.
// ------------------------------------------------------------
onMounted(async () => {
  await store.init()
  // retoma de onde parou (a menos que tenha vindo pedindo o sumário)
  const querSumario = router.currentRoute.value.query.ir === 'sumario'
  const ultima = store.progresso.ultima_secao
  if (!querSumario && ultima && WORKBOOK.some((s) => s.id === ultima)) {
    secaoAtiva.value = ultima
  }
  carregando.value = false
})
onBeforeUnmount(() => { store.flush() })   // troca de rota: força sync agora

// ------------------------------------------------------------
// navegação de seção
// ------------------------------------------------------------
function abrir(id) {
  secaoAtiva.value = id
  store.progresso.ultima_secao = id
  lacunaAtiva.value = null
  ultimaLacuna.value = null
  nextTick(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
    if (aberturaEl.value) aberturaEl.value.focarTitulo()
  })
}
function voltarSumario() {
  secaoAtiva.value = null
  nextTick(() => window.scrollTo({ top: 0, behavior: 'auto' }))
}
function voltarHeader() {
  if (secao.value) voltarSumario()
  else router.push({ name: 'ambiente' })
}

// ------------------------------------------------------------
// navegação por lacuna (teclado / barra / mapa)
// ------------------------------------------------------------
function movReduzido() {
  return typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
}
function lacunasDom() {
  return corpoEl.value ? Array.from(corpoEl.value.querySelectorAll('[data-lacuna]')) : []
}
/* leva a lacuna pro terço superior da tela — nunca pro topo cru, nunca
   atrás do cabeçalho sticky, nunca sob o teclado virtual (usa o
   visualViewport quando existe) */
function posicionar(el, forcar = false) {
  const vv = window.visualViewport
  const alturaUtil = vv ? vv.height : window.innerHeight
  const r = el.getBoundingClientRect()
  const alvo = Math.max(64, alturaUtil * 0.3)
  const confortavel = r.top >= 64 && r.bottom <= alturaUtil * 0.72
  if (!forcar && confortavel) return
  window.scrollBy({ top: r.top - alvo, behavior: movReduzido() ? 'auto' : 'smooth' })
}
function focarLacuna(el) {
  el.focus({ preventScroll: true })
  posicionar(el, true)
}
function irParaLacuna(id) {
  const el = lacunasDom().find((e) => e.dataset.lacuna === id)
  if (el) focarLacuna(el)
}
/** move o foco entre lacunas; devolve true se moveu (false no limite —
 *  aí o Tab nativo segue em frente e ninguém fica preso no grupo) */
function saltar(delta) {
  const els = lacunasDom()
  if (!els.length) return false
  const atualId = document.activeElement && document.activeElement.dataset
    ? document.activeElement.dataset.lacuna : null
  let i = els.findIndex((e) => e.dataset.lacuna === atualId)
  if (i === -1) {
    // nada focado: a partir do que está visível
    const primeiroVisivel = els.findIndex((e) => e.getBoundingClientRect().top > 64)
    i = delta > 0
      ? (primeiroVisivel === -1 ? els.length - 1 : primeiroVisivel)
      : (primeiroVisivel === -1 ? els.length - 1 : Math.max(0, primeiroVisivel - 1))
    focarLacuna(els[i])
    return true
  }
  const prox = Math.min(els.length - 1, Math.max(0, i + delta))
  if (prox === i) return false
  focarLacuna(els[prox])
  return true
}
function onKeydownCorpo(e) {
  const t = e.target
  if (!t || !t.dataset || !t.dataset.lacuna) return
  if (e.key === 'Tab') {
    if (saltar(e.shiftKey ? -1 : 1)) e.preventDefault()
    // no limite: Tab nativo sai do grupo (nunca vira armadilha de teclado)
  } else if (e.key === 'Enter' && t.tagName === 'INPUT') {
    e.preventDefault(); saltar(1)
  } else if (e.key === 'Escape') {
    t.blur()   // sai pro modo leitura
  }
}
function onFocusinCorpo(e) {
  const id = e.target && e.target.dataset ? e.target.dataset.lacuna : null
  if (!id) return
  lacunaAtiva.value = id
  ultimaLacuna.value = id
  posicionar(e.target)
}
function onFocusoutCorpo(e) {
  const rel = e.relatedTarget
  if (!rel || !rel.dataset || !rel.dataset.lacuna) lacunaAtiva.value = null
}

// ------------------------------------------------------------
// ditado por voz (progressive enhancement — só Chrome/Edge)
// ------------------------------------------------------------
const ditado = criarDitado({
  aoTexto(txt) {
    const id = ultimaLacuna.value
    if (!id) return
    const atual = store.get(id)
    store.set(id, atual ? atual.replace(/\s+$/, '') + ' ' + txt : txt)
  },
})
function alternarVoz() {
  ditado.alternar()
  if (ultimaLacuna.value) irParaLacuna(ultimaLacuna.value)
}

// ------------------------------------------------------------
// PDF do aluno (Agente D) — recebe strings puras
// ------------------------------------------------------------
const nomeAluno = ref('')
const gerandoPdf = ref(false)
async function baixarPdf() {
  gerandoPdf.value = true
  try {
    await store.flush()
    if (!nomeAluno.value) {
      const l = await getLead(currentUser()); nomeAluno.value = (l && l.nome) || ''
    }
    const { imprimeWorkbook } = await import('../data/book-print.js')
    imprimeWorkbook({ ...store.valores }, nomeAluno.value)
  } finally {
    gerandoPdf.value = false
  }
}

// capitular só quando o capítulo abre em prosa
function temCapitular(p, i) {
  return i === 0 && p.tipo === 'paragrafo' && p.blocos[0] && p.blocos[0].tipo === 'prosa'
}
</script>

<template>
  <div class="livro" lang="pt-BR">
    <CabecalhoCorrente
      :modo="secao ? 'leitura' : 'indice'"
      :rotulo="secao ? rotulo(secao) : 'Workbook · Holding Familiar'"
      :titulo="secao ? secao.titulo : ''"
      :pct="pct"
      :status="store.status.value"
      :pendentes="store.pendentes.value"
      :ultima-sync="store.ultimaSync.value"
      @voltar="voltarHeader" />

    <!-- carregando: esqueleto de página, não spinner -->
    <main v-if="carregando" class="pagina" aria-busy="true" aria-label="Carregando seu workbook">
      <div class="sk sk-num"></div>
      <div class="sk sk-tit"></div>
      <div class="sk" v-for="n in 7" :key="n" :style="{ width: (100 - n * 4) + '%' }"></div>
    </main>

    <!-- SUMÁRIO -->
    <main v-else-if="!secao" class="pagina">
      <header class="frontis">
        <p class="fr-kicker">Curso Nacional de Formação em Holding Familiar</p>
        <h1 class="fr-titulo">Workbook</h1>
        <p class="fr-sub">
          Caderno de acompanhamento das aulas. Preencha as lacunas enquanto o
          professor dita — cada tecla fica salva neste aparelho e sincroniza
          sozinha quando há rede.
        </p>
      </header>

      <nav aria-label="Sumário">
        <h2 class="sum-h">Sumário</h2>
        <ol class="sum">
          <li v-for="s in WORKBOOK" :key="s.id">
            <button class="sum-item" @click="abrir(s.id)">
              <span class="sum-num">{{ s.tipo === 'capitulo' ? s.romano : '§' + s.numero }}</span>
              <span class="sum-tit">{{ s.titulo }}</span>
              <span class="sum-leader" aria-hidden="true"></span>
              <span class="sum-prog" :class="{ completa: preenchidasNaSecao(s) === s.total_lacunas }">
                {{ preenchidasNaSecao(s) }}/{{ s.total_lacunas }}
              </span>
            </button>
          </li>
        </ol>
      </nav>

      <div class="sum-acoes">
        <button class="btn-livro" @click="baixarPdf" :disabled="gerandoPdf">
          <Download :size="15" aria-hidden="true" />
          {{ gerandoPdf ? 'Gerando…' : 'Baixar meu workbook em PDF' }}
        </button>
      </div>
    </main>

    <!-- LEITURA de um capítulo -->
    <main v-else class="pagina leitura">
      <AberturaCapitulo ref="aberturaEl" :secao="secao" :preenchidas="preenchidasNaSecao(secao)" />

      <div
        ref="corpoEl"
        class="corpo"
        :class="{ justif: prefs.justificar }"
        @keydown.capture="onKeydownCorpo"
        @focusin="onFocusinCorpo"
        @focusout="onFocusoutCorpo">
        <template v-for="(p, i) in secao.paragrafos" :key="secao.id + '-' + i">
          <p v-if="p.tipo === 'paragrafo'" class="par" :class="{ 'par-cap': temCapitular(p, i) }">
            <template v-for="(b, j) in p.blocos" :key="j">
              <template v-if="b.tipo === 'prosa'"><span class="prosa">{{ b.texto }}</span>{{ ' ' }}</template>
              <template v-else-if="b.tipo === 'lacuna' && b.tamanho === 'linha'"><LacunaInline
                  v-model="store.valores[b.id]" :bloco="b" :meta="META[b.id]" /><span
                  v-if="b.sufixo" class="suf">{{ b.sufixo }}</span>{{ ' ' }}</template>
              <template v-else-if="b.tipo === 'lacuna'"><LacunaBloco
                  v-model="store.valores[b.id]" :bloco="b" :meta="META[b.id]"
                  :sufixo="b.sufixo || ''" />{{ ' ' }}</template>
            </template>
          </p>

          <h2 v-else-if="p.tipo === 'subtitulo'" class="subtitulo">{{ p.texto }}</h2>

          <CitacaoLegal
            v-else-if="p.tipo === 'citacao-legal'"
            v-model="store.valores[p.id]"
            :bloco="p"
            :meta="META[p.id]" />
        </template>
      </div>

      <footer class="fim">
        <div class="fleuron" aria-hidden="true">❦</div>
        <p v-if="secao.ancora" class="ancora">{{ ANCORA }}</p>
        <nav class="fim-nav" aria-label="Navegação entre capítulos">
          <button v-if="secAnterior" class="fim-ir ant" @click="abrir(secAnterior.id)">
            <span class="fim-rot">‹ {{ rotulo(secAnterior) }}</span>
            <span class="fim-tit">{{ secAnterior.titulo }}</span>
          </button>
          <span v-else></span>
          <button v-if="secProxima" class="fim-ir prox" @click="abrir(secProxima.id)">
            <span class="fim-rot">{{ rotulo(secProxima) }} ›</span>
            <span class="fim-tit">{{ secProxima.titulo }}</span>
          </button>
          <button v-else class="fim-ir prox" @click="voltarSumario">
            <span class="fim-rot">Fim do workbook</span>
            <span class="fim-tit">Voltar ao sumário</span>
          </button>
        </nav>
      </footer>
    </main>

    <MapaLacunas
      v-if="secao && !carregando"
      :itens="itensMapa"
      :ativa="lacunaAtiva"
      :preenchidas="secao ? preenchidasNaSecao(secao) : 0"
      @ir="irParaLacuna" />

    <BarraLacunas
      v-if="secao && !carregando"
      :atual="lacunaAtiva && META[lacunaAtiva] ? META[lacunaAtiva].n : null"
      :total="secao.total_lacunas"
      :preenchidas="preenchidasNaSecao(secao)"
      :voz-suportada="ditado.suportado"
      :gravando="ditado.gravando.value"
      @anterior="saltar(-1)"
      @proxima="saltar(1)"
      @voz="alternarVoz" />
  </div>
</template>

<style scoped>
/* ============ a página é o papel — sem cartões ============ */
.livro {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  background: var(--papel);
  color: var(--tinta);
}
.pagina {
  max-width: 66ch;
  margin: 0 auto;
  padding: 0 clamp(18px, 4vw, 32px) 120px;
  font-family: var(--fonte-corpo);
  font-size: var(--fs-livro);
  line-height: var(--lh-livro);
}

/* esqueleto de carga */
.sk {
  height: 0.9em;
  margin: 1.1em 0;
  border-radius: 4px;
  background: color-mix(in srgb, var(--tinta) 8%, transparent);
  animation: sk-respira 1.4s ease-in-out infinite;
}
.sk-num { width: 90px; height: 84px; margin-top: 72px; }
.sk-tit { width: 60%; height: 1.8em; }
@keyframes sk-respira { 50% { opacity: 0.45; } }

/* ============ frontispício + sumário ============ */
.frontis { padding: clamp(44px, 10vh, 96px) 0 12px; }
.fr-kicker {
  margin: 0;
  font-family: var(--fonte-ui);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--resposta);
}
.fr-titulo {
  margin: 10px 0 0;
  font-family: var(--fonte-livro);
  font-weight: 700;
  font-size: clamp(40px, 8vw, 58px);
  line-height: 1.05;
  letter-spacing: -0.015em;
}
.fr-sub {
  margin: 16px 0 0;
  max-width: 46ch;
  font-size: 0.92em;
  color: var(--tinta-2);
}
.sum-h {
  margin: 44px 0 10px;
  font-family: var(--fonte-ui);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--tinta-2);
}
.sum { list-style: none; margin: 0; padding: 0; }
.sum-item {
  width: 100%;
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 13px 4px;
  background: none;
  border: none;
  border-bottom: 1px solid color-mix(in srgb, var(--pauta) 28%, transparent);
  font-family: var(--fonte-livro);
  font-size: 0.96em;
  color: var(--tinta);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}
.sum-item:hover { background: var(--resposta-bg); }
.sum-num {
  flex: 0 0 44px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--resposta);
}
.sum-tit { flex-shrink: 1; line-height: 1.35; }
.sum-leader {
  flex: 1;
  min-width: 24px;
  border-bottom: 1px dotted var(--pauta-suave);
  transform: translateY(-0.28em);
}
.sum-prog {
  font-family: var(--fonte-ui);
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--tinta-2);
}
.sum-prog.completa { color: var(--ok); }
.sum-acoes { margin-top: 30px; }
.btn-livro {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--fonte-ui);
  font-size: 13.5px;
  font-weight: 600;
  color: var(--tinta);
  background: transparent;
  border: 1px solid var(--pauta);
  border-radius: 10px;
  padding: 11px 18px;
  min-height: 44px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.btn-livro:hover { background: var(--resposta-bg); }
.btn-livro:disabled { opacity: 0.55; cursor: wait; }

/* ============ corpo do capítulo ============ */
.corpo { text-align: left; }
.corpo.justif { text-align: justify; hyphens: auto; -webkit-hyphens: auto; }
.par { margin: 0 0 1.15em; }
/* recuo clássico de livro a partir do 2º parágrafo */
.par + .par { text-indent: 1.6em; margin-top: -0.35em; }
/* capitular no primeiro parágrafo do capítulo */
.par-cap::first-letter {
  font-size: 3.05em;
  font-weight: 600;
  float: left;
  line-height: 0.82;
  padding: 0.04em 0.09em 0 0;
  color: var(--tinta);
}
.suf { color: var(--tinta); }

.subtitulo {
  margin: 2em 0 0.8em;
  font-family: var(--fonte-ui);
  font-size: 0.78em;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--tinta);
  text-indent: 0;
}

/* ============ fim de capítulo ============ */
.fim { margin-top: 56px; text-align: center; }
.fleuron { font-size: 20px; color: var(--pauta); }
.ancora {
  margin: 18px auto 0;
  max-width: 34ch;
  font-family: var(--fonte-livro);
  font-style: italic;
  font-size: 1.02em;
  color: var(--tinta-2);
}
.fim-nav {
  margin-top: 40px;
  display: flex;
  justify-content: space-between;
  gap: 14px;
  border-top: 1px solid color-mix(in srgb, var(--pauta) 30%, transparent);
  padding-top: 20px;
}
.fim-ir {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-width: 46%;
  background: none;
  border: none;
  padding: 10px 8px;
  min-height: 44px;
  cursor: pointer;
  border-radius: 8px;
  text-align: left;
  transition: background 0.15s;
}
.fim-ir.prox { text-align: right; margin-left: auto; }
.fim-ir:hover { background: var(--resposta-bg); }
.fim-rot {
  font-family: var(--fonte-ui);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--resposta);
}
.fim-tit { font-family: var(--fonte-livro); font-size: 0.92em; color: var(--tinta-2); line-height: 1.3; }

/* ============ mobile ============ */
@media (max-width: 560px) {
  .pagina { padding-bottom: 140px; }
  .corpo.justif { text-align: left; hyphens: none; } /* coluna estreita: ragged sempre */
  .sum-num { flex-basis: 34px; }
}
</style>
