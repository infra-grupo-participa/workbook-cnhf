<script setup>
import { ref, computed, onMounted } from 'vue'
import LogoCNHF from '../components/LogoCNHF.vue'
import PieChart from '../components/PieChart.vue'
import Download from '@lucide/vue/dist/esm/icons/download.mjs'
import TriangleAlert from '@lucide/vue/dist/esm/icons/triangle-alert.mjs'
import { getAllResults } from '../data/api.js'
import { SURVEY, SURVEY_CHART, SURVEY_TEXT, questaoLabel } from '../data/survey-schema.js'

const respostas = ref([])
const aba = ref('tabela')

onMounted(async () => { respostas.value = await getAllResults() })

// distribuição por opção (para as pizzas)
function distribuicao(q) {
  const cont = {}
  for (const op of q.opcoes) cont[op] = 0
  for (const r of respostas.value) {
    const v = r.answers?.[q.id]
    if (v != null && cont[v] != null) cont[v]++
  }
  return q.opcoes.map((op) => ({ label: op, value: cont[op] }))
}

const dataFmt = (ts) => {
  const d = new Date(ts)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function exportCsv() {
  const cols = ['email', 'nome', 'data', ...SURVEY.map((q) => q.id)]
  const linhas = respostas.value.map((r) => [
    r.email, r.nome, dataFmt(r.ts),
    ...SURVEY.map((q) => (r.answers?.[q.id] ?? '').toString().replace(/\n/g, ' ').replace(/;/g, ',')),
  ])
  const csv = [cols, ...linhas].map((l) => l.join(';')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  a.download = 'respostas-pesquisa.csv'
  a.click(); URL.revokeObjectURL(a.href)
}

const total = computed(() => respostas.value.length)
</script>

<template>
  <div class="shell">
    <header class="top card">
      <LogoCNHF :height="32" />
      <div class="acts">
        <span class="meta muted">{{ total }} resposta(s)</span>
        <button class="btn" @click="exportCsv"><Download :size="15" :stroke-width="2" /> CSV</button>
      </div>
    </header>

    <div class="head card">
      <div>
        <div class="eyebrow">Resultado das pesquisas</div>
        <h1>Dashboard de qualificação</h1>
      </div>
      <nav class="abas">
        <button class="aba" :class="{ on: aba === 'tabela' }" @click="aba = 'tabela'">Tabela</button>
        <button class="aba" :class="{ on: aba === 'graficos' }" @click="aba = 'graficos'">Gráficos</button>
      </nav>
    </div>

    <p v-if="!total" class="vazio card muted">Ainda não há respostas. Assim que os leads responderem a pesquisa, os dados aparecem aqui.</p>

    <!-- TABELA -->
    <div v-else-if="aba === 'tabela'" class="card tblcard">
      <div class="tblScroll">
        <table class="tbl">
          <thead>
            <tr>
              <th>E-mail</th><th>Nome</th><th>Data</th>
              <th v-for="q in SURVEY" :key="q.id">{{ q.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in respostas" :key="i">
              <td class="mono">{{ r.email }}</td>
              <td>{{ r.nome || '—' }}</td>
              <td class="nowrap">{{ dataFmt(r.ts) }}</td>
              <td v-for="q in SURVEY" :key="q.id" :class="{ txt: q.tipo === 'textarea' }">{{ r.answers?.[q.id] || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- GRÁFICOS -->
    <div v-else class="graficos">
      <div v-for="q in SURVEY_CHART" :key="q.id" class="card pcard">
        <div class="eyebrow">{{ q.label }}</div>
        <PieChart :data="distribuicao(q)" />
      </div>

      <div v-for="q in SURVEY_TEXT" :key="q.id" class="card tcard">
        <div class="eyebrow">{{ q.label }}</div>
        <ul class="abertas">
          <li v-for="(r, i) in respostas.filter(r => r.answers?.[q.id])" :key="i">
            <span class="quem muted">{{ r.nome || r.email }}</span>
            {{ r.answers[q.id] }}
          </li>
        </ul>
      </div>
    </div>

    <p class="admin muted"><TriangleAlert :size="13" :stroke-width="2" /> Página administrativa. Na Fase 2 (Supabase) fica restrita à equipe por RLS/login de admin.</p>
  </div>
</template>

<style scoped>
.shell { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; padding: 18px 18px 50px; display: flex; flex-direction: column; gap: 14px; }
.top { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; color: var(--ink); }
.acts { display: flex; align-items: center; gap: 12px; }
.meta { font-size: 13px; }
.head { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; gap: 16px; flex-wrap: wrap; }
.head h1 { font-size: 20px; margin: 4px 0 0; }
.abas { display: flex; gap: 4px; background: var(--bg); border: 1px solid var(--stroke); border-radius: 999px; padding: 4px; }
.aba { font: inherit; font-size: 13px; font-weight: 700; color: var(--ink-2); background: none; border: none; cursor: pointer; padding: 7px 16px; border-radius: 999px; }
.aba.on { background: var(--accent); color: #fff; }
.vazio { padding: 40px; text-align: center; }

.tblcard { padding: 8px; }
.tblScroll { overflow-x: auto; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: .06em; color: var(--ink-3); padding: 10px; border-bottom: 1px solid var(--stroke); white-space: nowrap; }
.tbl td { padding: 10px; border-bottom: 1px solid var(--stroke); vertical-align: top; }
.tbl td.txt { min-width: 220px; color: var(--ink-2); }
.mono { font-family: ui-monospace, Menlo, monospace; font-size: 12px; }
.nowrap { white-space: nowrap; }

.graficos { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
.pcard { padding: 18px 20px; }
.pcard .eyebrow { margin-bottom: 14px; }
.tcard { padding: 18px 20px; grid-column: 1 / -1; }
.abertas { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.abertas li { font-size: 13.5px; line-height: 1.5; padding-left: 12px; border-left: 2px solid var(--accent-line); }
.abertas .quem { display: block; font-size: 11.5px; margin-bottom: 2px; }
.admin { font-size: 12px; text-align: center; margin-top: 8px; }
.admin svg { vertical-align: -2px; }
</style>
