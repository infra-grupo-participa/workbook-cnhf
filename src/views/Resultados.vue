<script setup>
import { ref, computed, onMounted } from 'vue'
import LogoCNHF from '../components/LogoCNHF.vue'
import PieChart from '../components/PieChart.vue'
import Download from '@lucide/vue/dist/esm/icons/download.mjs'
import TriangleAlert from '@lucide/vue/dist/esm/icons/triangle-alert.mjs'
import { getAllResults } from '../data/api.js'
import { SURVEY, SURVEY_CHART, SURVEY_TEXT } from '../data/survey-schema.js'

/* ------------------------------------------------------------
   Carga defensiva: o BE está paginando getAllResults. Aceitamos
   os dois formatos — array puro (atual) OU { items, total }.
   Se vier paginado e faltar gente, aparece o "Carregar mais".
   ------------------------------------------------------------ */
const carregando = ref(true)
const falhou = ref(false)
const linhas = ref([])
const totalRemoto = ref(null)
const maisCarregando = ref(false)

function normaliza(r) {
  if (Array.isArray(r)) return { items: r, total: null }
  if (r && Array.isArray(r.items)) return { items: r.items, total: r.total ?? null }
  if (r && Array.isArray(r.rows)) return { items: r.rows, total: r.total ?? null }
  return { items: null, total: null }
}

onMounted(async () => {
  try {
    const { items, total } = normaliza(await getAllResults())
    if (items === null) { falhou.value = true } else { linhas.value = items; totalRemoto.value = total }
  } catch { falhou.value = true }
  carregando.value = false
})

const temMais = computed(() =>
  totalRemoto.value != null && linhas.value.length < totalRemoto.value)

async function carregarMais() {
  if (maisCarregando.value) return
  maisCarregando.value = true
  try {
    const { items, total } = normaliza(await getAllResults({ offset: linhas.value.length }))
    if (items) {
      const vistos = new Set(linhas.value.map((x) => `${x.email}|${x.ts}`))
      for (const it of items) if (!vistos.has(`${it.email}|${it.ts}`)) linhas.value.push(it)
    }
    if (total != null) totalRemoto.value = total
  } finally { maisCarregando.value = false }
}

// ------------------------------------------------------------
// filtros, busca e ordenação (sobre o que já foi carregado)
// ------------------------------------------------------------
const aba = ref('leitura')
const busca = ref('')
const fArea = ref('')
const fFat = ref('')
const ordem = ref('recentes')

const OPS_AREA = SURVEY.find((q) => q.id === 'area')?.opcoes || []
const OPS_FAT = SURVEY.find((q) => q.id === 'faturamento')?.opcoes || []

const filtrados = computed(() => {
  const q = busca.value.trim().toLowerCase()
  let out = linhas.value.filter((r) => {
    if (fArea.value && r.answers?.area !== fArea.value) return false
    if (fFat.value && r.answers?.faturamento !== fFat.value) return false
    if (!q) return true
    const campos = [r.email, r.nome, ...Object.values(r.answers || {})]
    return campos.some((v) => String(v || '').toLowerCase().includes(q))
  })
  out = [...out]
  if (ordem.value === 'recentes') out.sort((a, b) => new Date(b.ts) - new Date(a.ts))
  else if (ordem.value === 'antigas') out.sort((a, b) => new Date(a.ts) - new Date(b.ts))
  else out.sort((a, b) => (a.nome || a.email || '').localeCompare(b.nome || b.email || '', 'pt-BR'))
  return out
})

const total = computed(() => totalRemoto.value ?? linhas.value.length)
const filtrando = computed(() => !!(busca.value.trim() || fArea.value || fFat.value))
function limparFiltros() { busca.value = ''; fArea.value = ''; fFat.value = '' }

// distribuição por opção (pizzas) — respeita os filtros ativos
function distribuicao(q) {
  const cont = {}
  for (const op of q.opcoes) cont[op] = 0
  for (const r of filtrados.value) {
    const v = r.answers?.[q.id]
    if (v != null && cont[v] != null) cont[v]++
  }
  return q.opcoes.map((op) => ({ label: op, value: cont[op] }))
}

/* respostas abertas de um lead (só as respondidas) */
function abertas(r) {
  return SURVEY_TEXT
    .map((q) => ({ id: q.id, label: q.label, texto: (r.answers?.[q.id] || '').trim() }))
    .filter((x) => x.texto)
}

const dataFmt = (ts) => {
  const d = new Date(ts)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function exportCsv() {
  const cols = ['email', 'nome', 'data', ...SURVEY.map((q) => q.id)]
  const lin = filtrados.value.map((r) => [
    r.email, r.nome, dataFmt(r.ts),
    ...SURVEY.map((q) => (r.answers?.[q.id] ?? '').toString().replace(/\n/g, ' ').replace(/;/g, ',')),
  ])
  const csv = [cols, ...lin].map((l) => l.join(';')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  a.download = 'respostas-pesquisa.csv'
  a.click(); URL.revokeObjectURL(a.href)
}

const ABAS = [
  { id: 'leitura', label: 'Leitura' },
  { id: 'tabela', label: 'Tabela' },
  { id: 'graficos', label: 'Gráficos' },
]
</script>

<template>
  <div class="shell">
    <header class="top card">
      <LogoCNHF :height="32" />
      <div class="acts">
        <span class="meta muted">{{ total }} resposta(s)</span>
        <button class="btn" @click="exportCsv" :disabled="!filtrados.length"
          :aria-label="filtrando ? 'Exportar CSV das respostas filtradas' : 'Exportar CSV de todas as respostas'">
          <Download :size="15" :stroke-width="2" aria-hidden="true" /> CSV
        </button>
      </div>
    </header>

    <div class="head card">
      <div>
        <div class="eyebrow">Resultado das pesquisas</div>
        <h1>Dashboard de qualificação</h1>
      </div>
      <nav class="abas" aria-label="Modo de visualização">
        <button v-for="a in ABAS" :key="a.id" class="aba" :class="{ on: aba === a.id }"
          :aria-pressed="aba === a.id" @click="aba = a.id">{{ a.label }}</button>
      </nav>
    </div>

    <!-- toolbar de filtros -->
    <div class="card ferramentas" v-if="!carregando && linhas.length">
      <label class="sr-only" for="res-busca">Buscar por nome, e-mail ou resposta</label>
      <input id="res-busca" type="search" v-model="busca" class="busca"
        placeholder="Buscar nome, e-mail ou trecho de resposta…" />
      <label class="sr-only" for="res-area">Filtrar por profissão</label>
      <select id="res-area" v-model="fArea">
        <option value="">Profissão: todas</option>
        <option v-for="o in OPS_AREA" :key="o" :value="o">{{ o }}</option>
      </select>
      <label class="sr-only" for="res-fat">Filtrar por faturamento</label>
      <select id="res-fat" v-model="fFat">
        <option value="">Faturamento: todos</option>
        <option v-for="o in OPS_FAT" :key="o" :value="o">{{ o }}</option>
      </select>
      <label class="sr-only" for="res-ordem">Ordenar</label>
      <select id="res-ordem" v-model="ordem">
        <option value="recentes">Mais recentes</option>
        <option value="antigas">Mais antigas</option>
        <option value="nome">Nome A–Z</option>
      </select>
      <span class="conta muted" aria-live="polite">
        {{ filtrados.length === linhas.length ? `${linhas.length}` : `${filtrados.length} de ${linhas.length}` }}
      </span>
      <button v-if="filtrando" class="link" @click="limparFiltros">Limpar</button>
    </div>

    <p v-if="carregando" class="vazio card muted">Carregando respostas…</p>
    <p v-else-if="falhou" class="vazio card alert bad" role="alert">
      Não foi possível carregar as respostas. Recarregue a página; se persistir,
      verifique sua sessão de administrador.
    </p>
    <p v-else-if="!linhas.length" class="vazio card muted">
      Ainda não há respostas. Assim que os leads responderem a pesquisa, os dados aparecem aqui.
    </p>
    <p v-else-if="!filtrados.length" class="vazio card muted">
      Nenhuma resposta bate com os filtros. <button class="link" @click="limparFiltros">Limpar filtros</button>
    </p>

    <!-- LEITURA: o material qualitativo em primeiro plano -->
    <div v-else-if="aba === 'leitura'" class="leitura">
      <article v-for="(r, i) in filtrados" :key="r.email + i" class="card lead">
        <header class="lead-head">
          <div class="lead-quem">
            <strong class="lead-nome">{{ r.nome || '—' }}</strong>
            <span class="lead-email mono">{{ r.email }}</span>
          </div>
          <span class="lead-data muted">{{ dataFmt(r.ts) }}</span>
        </header>
        <div class="lead-chips">
          <span v-for="q in SURVEY_CHART" :key="q.id" v-show="r.answers?.[q.id]"
            class="chip" :title="q.label">{{ r.answers?.[q.id] }}</span>
          <span v-if="r.duplicado" class="chip alerta" title="Já existe outra resposta com este e-mail ou telefone">duplicado</span>
        </div>
        <div v-if="abertas(r).length" class="lead-abertas">
          <div v-for="a in abertas(r)" :key="a.id" class="aberta">
            <div class="eyebrow">{{ a.label }}</div>
            <p class="aberta-texto">{{ a.texto }}</p>
          </div>
        </div>
        <p v-else class="muted sem-abertas">Sem respostas abertas.</p>
      </article>
    </div>

    <!-- TABELA -->
    <div v-else-if="aba === 'tabela'" class="card tblcard">
      <div class="tblScroll" tabindex="0" role="region" aria-label="Tabela de respostas (rolagem horizontal)">
        <table class="tbl">
          <thead>
            <tr>
              <th scope="col">E-mail</th><th scope="col">Nome</th><th scope="col">Data</th>
              <th scope="col" v-for="q in SURVEY" :key="q.id">{{ q.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in filtrados" :key="r.email + i">
              <td class="mono">{{ r.email }}</td>
              <td>{{ r.nome || '—' }}</td>
              <td class="nowrap">{{ dataFmt(r.ts) }}</td>
              <td v-for="q in SURVEY" :key="q.id" :class="{ txt: q.tipo === 'textarea' }">{{ r.answers?.[q.id] || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- GRÁFICOS (respeitam os filtros ativos) -->
    <div v-else class="graficos">
      <div v-for="q in SURVEY_CHART" :key="q.id" class="card pcard">
        <div class="eyebrow">{{ q.label }}</div>
        <PieChart :data="distribuicao(q)" />
      </div>
    </div>

    <div v-if="temMais && !carregando" class="mais">
      <button class="btn" :disabled="maisCarregando" @click="carregarMais">
        {{ maisCarregando ? 'Carregando…' : `Carregar mais (${linhas.length} de ${totalRemoto})` }}
      </button>
    </div>

    <p class="admin muted"><TriangleAlert :size="13" :stroke-width="2" aria-hidden="true" />
      Página administrativa — acesso restrito por perfil de admin (RLS).</p>
  </div>
</template>

<style scoped>
.shell { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; padding: 18px 18px 60px; display: flex; flex-direction: column; gap: 14px; }
.top { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; color: var(--ink); flex-wrap: wrap; gap: 8px; }
.acts { display: flex; align-items: center; gap: 12px; }
.meta { font-size: 13px; }
.head { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; gap: 16px; flex-wrap: wrap; }
.head h1 { font-size: 20px; margin: 4px 0 0; }
.abas { display: flex; gap: 4px; background: var(--bg); border: 1px solid var(--stroke); border-radius: 999px; padding: 4px; }
.aba { font: inherit; font-size: 13px; font-weight: 700; color: var(--ink-2); background: none; border: none; cursor: pointer; padding: 9px 16px; min-height: 38px; border-radius: 999px; }
.aba.on { background: var(--cta); color: #fff; }
.vazio { padding: 32px; text-align: center; }

.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

.ferramentas { display: flex; align-items: center; gap: 10px; padding: 12px 14px; flex-wrap: wrap; }
.busca { flex: 2 1 240px; min-width: 200px; }
.ferramentas select { flex: 0 1 auto; width: auto; font-size: 13.5px; padding: 10px 12px; min-height: 44px; }
.conta { font-size: 12.5px; font-variant-numeric: tabular-nums; white-space: nowrap; margin-left: auto; }

/* ---- leitura qualitativa ---- */
.leitura { display: flex; flex-direction: column; gap: 12px; }
.lead { padding: 18px 22px; }
.lead-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.lead-quem { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; min-width: 0; }
.lead-nome { font-size: 15.5px; }
.lead-email { color: var(--ink-2); overflow-wrap: anywhere; }
.lead-data { font-size: 12.5px; white-space: nowrap; }
.lead-chips { display: flex; gap: 6px; flex-wrap: wrap; margin: 8px 0 2px; }
.chip {
  font-size: 12px; font-weight: 600; color: var(--ink-2);
  border: 1px solid var(--stroke-strong); border-radius: 999px; padding: 4px 11px;
}
.chip.alerta { color: var(--bad-text); border-color: var(--bad); }
.lead-abertas { margin-top: 12px; display: flex; flex-direction: column; gap: 12px; }
.aberta { padding-left: 14px; border-left: 2px solid var(--accent-line); }
.aberta .eyebrow { margin-bottom: 4px; }
.aberta-texto {
  margin: 0;
  font-family: var(--fonte-livro);
  font-size: 15px;
  line-height: 1.65;
  color: var(--ink);
  white-space: pre-wrap;
  max-width: 75ch;
}
.sem-abertas { font-size: 13px; margin: 10px 0 0; }

/* ---- tabela ---- */
.tblcard { padding: 8px; }
.tblScroll { overflow-x: auto; }
.tblScroll:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: .06em; color: var(--ink-2); padding: 10px; border-bottom: 1px solid var(--stroke); white-space: nowrap; position: sticky; top: 0; background: var(--surface); }
.tbl td { padding: 10px; border-bottom: 1px solid var(--stroke); vertical-align: top; }
.tbl td.txt { min-width: 220px; color: var(--ink-2); }
.mono { font-family: ui-monospace, Menlo, monospace; font-size: 12px; }
.nowrap { white-space: nowrap; }

.graficos { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
.pcard { padding: 18px 20px; }
.pcard .eyebrow { margin-bottom: 14px; }

.mais { display: flex; justify-content: center; }
.admin { font-size: 12px; text-align: center; margin-top: 8px; }
.admin svg { vertical-align: -2px; }

@media (max-width: 640px) {
  .ferramentas select, .busca { flex: 1 1 100%; }
  .conta { margin-left: 0; }
  .aba { min-height: 44px; }
}
</style>
