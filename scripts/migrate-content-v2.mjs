#!/usr/bin/env node
// migrate-content-v2.mjs — migra src/data/workbook-content.js do schema v1 (blocos
// planos) para o schema v2 (parágrafos), conforme CONTRATO 1 de tmp/squad/workbook-livro.md.
//
// Uso:  node scripts/migrate-content-v2.mjs [entrada] [saida]
//       (default: src/data/workbook-content.js em ambos — migra in place)
//
// REGRAS INVIOLÁVEIS:
//   - Nenhum byte de prosa é alterado: blocos de prosa só são AGRUPADOS em
//     parágrafos ou DIVIDIDOS em limite de frase (a concatenação permanece
//     byte a byte idêntica à v1) — com UMA exceção autorizada explicitamente
//     pelo orquestrador em 26/07/2026: colapso de espaço em branco
//     imediatamente anterior a `,` `;` `.` `:` (artefato da transcrição do
//     PDF, ex.: "to hold ,", "célula cofre ,", "isenção :"). Nenhuma outra
//     normalização é permitida (nem espaço duplo interno, nem ortografia,
//     nem maiúsculas).
//   - Nenhum id de lacuna muda. Campos existentes (linhas, tamanho, sufixo,
//     rotulo) são preservados como estão.
//
// Heurística de segmentação:
//   1. `subtitulo` e `citacao-legal` sobem para o nível de parágrafo e quebram
//      o parágrafo corrente antes e depois.
//   2. Dentro de uma corrida prosa+lacuna, abre parágrafo novo quando o bloco
//      de prosa começa com maiúscula E o conteúdo emitido imediatamente antes
//      terminou em `.`, `?` ou `!` (o terminador pode estar no `sufixo` da
//      lacuna anterior).
//   3. QUEBRAS_CURADAS: inícios de frase que marcam mudança de tópico dentro
//      de um mesmo bloco de prosa (curadoria manual reproduzível — editar AQUI,
//      nunca no output).
//   4. Guarda de comprimento: parágrafo com mais de ~LIMITE_PROSA caracteres
//      de prosa é dividido no limite de frase mais próximo do alvo.
//   5. Lacuna e seu `sufixo` são a mesma unidade — nunca são separados.
//
// Novos campos:
//   - `romano`: numeral romano pré-calculado para capítulos; null para extras.
//   - `largura` (só lacunas `tamanho: 'linha'`): dica de largura da linha
//     pautada inline, curada lendo a prosa ao redor (mapa LARGURAS abaixo).

import { pathToFileURL } from 'node:url'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ---------------------------------------------------------------- parâmetros

const ALVO_PROSA = 700 // alvo de caracteres de prosa por parágrafo
const DIVIDE_ACIMA = 740 // só divide se o parágrafo exceder isso (alvo + folga)
const MIN_CABECA = 250 // prosa mínima antes de um corte
const MIN_CAUDA = 200 // prosa mínima depois de um corte

const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

// Larguras das lacunas inline (tamanho: 'linha'), curadas lendo o contexto.
// xs≈6ch  sm≈10ch  md≈18ch  lg≈28ch  xl≈40ch
const LARGURAS = {
  'cap-1-l1': 'xs', // "a distinção corresponde ao art. ___" → nº de artigo (LSA)
  'cap-1-l2': 'sm', // tradução adequada de "to hold" → uma palavra
  'cap-1-l3': 'md', // "como em ___" → expressão-exemplo curta
  'cap-1-l4': 'xl', // "Fixa-se, portanto, o conceito: ___" → enunciado em uma linha
  'cap-1-l5': 'xs', // "pois o art. ___" → nº de artigo (CC, 981)
  'cap-1-l8': 'md', // "A superação desse obstáculo ocorreu ___" → lugar/época
  'cap-1-l9': 'sm', // "por via jurisprudencial própria do ___" → "common law"
  'cap-1-l13': 'md', // "a criação de uma ___" → termo técnico ("ficção jurídica")
  'cap-3-l8': 'md', // "três critérios de valoração: o ___" → "valor nominal"
  'cap-3-l18': 'xl', // "A integralização de capital social ___" → oração curta
  'cap-3-l20': 'lg', // "regido pelo ___" → Regulamento do IR (Decreto 9.580/2018)
  'cap-4-l25': 'lg', // "A ___ preserva a imunidade" → nome da técnica
  'cap-6-l6': 'sm', // "o preceito não ___" → um verbo ("incide")
  'extra-2-l9': 'xs', // "pelos Decretos ___/2002" → nº do decreto
  'extra-2-l10': 'xs', // "e ___/2005" → nº do decreto
  'cap-7-l9': 'md', // "A técnica complementar dos ___" → termo curto (percentual)
  'extra-3-l2': 'lg', // "das sociedades ___" → "optantes pelo Simples Nacional"
  'extra-4-l9': 'lg', // segundo item do registro de alterações → oração curta
}

// Inícios de frase que marcam mudança de tópico DENTRO de um bloco de prosa.
// A frase precisa vir logo após um terminador (.?!) — o script valida.
const QUEBRAS_CURADAS = [
  // cap-2 — as sete aplicações práticas viram parágrafos próprios
  'Tributação de dividendos.',
  'Majoração da base de cálculo do lucro presumido.',
  'Tributação dos aluguéis.',
  'Estruturação de negócios.',
  'Preservação de legado.',
  'Proteção patrimonial.',
  'Supressão do inventário.',
  // cap-1 — mudança de tópico no meio de um bloco longo de prosa
  'Sobre esse fundamento constrói-se a Holding Familiar.',
]

// ---------------------------------------------------------------- utilidades

// Abre parágrafo: letra maiúscula OU item enumerado "(1)", "(2)"… (cap-5)
const ABRE_PARAGRAFO = /^(?:[A-ZÀ-ÖØ-Þ]|\(\d+\))/

// ÚNICA normalização autorizada (ver cabeçalho): remove espaço em branco
// imediatamente antes de , ; . : — artefato da transcrição do PDF.
// 8 ocorrências na transcrição de JUL/2026 (cap-1 ×2, cap-3 ×3, extra-2 ×3).
const colapsaEspacoAntesDePontuacao = (s) => s.replace(/\s+(?=[,;.:])/g, '')

const terminaFrase = (s) => /[.!?]$/.test(s.trimEnd())
const sufixoTermina = (s) => /[.!?]/.test(s ?? '')

// Posições de corte no fim de frase: após ". " quando a próxima palavra
// começa com maiúscula (o espaço fica com a primeira metade).
function limitesDeFrase(texto) {
  const out = []
  const re = /[.!?]\s+(?=[A-ZÀ-ÖØ-Þ])/g
  let m
  while ((m = re.exec(texto))) out.push(m.index + m[0].length)
  return out
}

// Pré-divide um bloco de prosa nas quebras curadas (concatenação preservada).
function aplicaQuebrasCuradas(texto) {
  for (const marca of QUEBRAS_CURADAS) {
    const i = texto.indexOf(marca)
    if (i > 0 && /[.!?]\s*$/.test(texto.slice(0, i))) {
      return [...aplicaQuebrasCuradas(texto.slice(0, i)), ...aplicaQuebrasCuradas(texto.slice(i))]
    }
  }
  return [texto]
}

// Pré-divide: quebras curadas + itens enumerados "(n)" após fim de frase.
function preDivide(texto) {
  return aplicaQuebrasCuradas(texto).flatMap((p) => {
    const out = []
    let ini = 0
    const re = /[.!?]\s+(?=\(\d+\))/g
    let m
    while ((m = re.exec(p))) {
      const corte = m.index + m[0].length
      out.push(p.slice(ini, corte))
      ini = corte
    }
    out.push(p.slice(ini))
    return out
  })
}

const prosaLen = (blocos) => blocos.reduce((n, b) => n + (b.tipo === 'prosa' ? b.texto.length : 0), 0)

// Guarda de comprimento: divide parágrafos longos no limite de frase mais
// próximo do alvo, respeitando cabeça/cauda mínimas. Recursivo na cauda.
function divideLongo(par) {
  const total = prosaLen(par.blocos)
  if (total <= DIVIDE_ACIMA) return [par]
  const candidatos = []
  let acc = 0
  par.blocos.forEach((b, bi) => {
    if (b.tipo !== 'prosa') return
    for (const corte of limitesDeFrase(b.texto)) candidatos.push({ bi, corte, global: acc + corte })
    acc += b.texto.length
  })
  const validos = candidatos.filter((c) => c.global >= MIN_CABECA && total - c.global >= MIN_CAUDA)
  if (!validos.length) return [par]
  let melhor = validos[0]
  for (const c of validos) {
    if (Math.abs(c.global - ALVO_PROSA) < Math.abs(melhor.global - ALVO_PROSA)) melhor = c
  }
  const b = par.blocos[melhor.bi]
  const cabeca = [...par.blocos.slice(0, melhor.bi), { tipo: 'prosa', texto: b.texto.slice(0, melhor.corte) }]
  const cauda = [{ tipo: 'prosa', texto: b.texto.slice(melhor.corte) }, ...par.blocos.slice(melhor.bi + 1)]
  return [{ tipo: 'paragrafo', blocos: cabeca }, ...divideLongo({ tipo: 'paragrafo', blocos: cauda })]
}

// ---------------------------------------------------------------- migração

const semLargura = []

function migraSecao(sec) {
  const paragrafos = []
  let cur = []
  let terminou = true // início de seção conta como "após terminador"

  const fecha = () => {
    if (cur.length) {
      paragrafos.push(...divideLongo({ tipo: 'paragrafo', blocos: cur }))
      cur = []
    }
  }

  for (const b of sec.blocos) {
    if (b.tipo === 'subtitulo' || b.tipo === 'citacao-legal') {
      fecha()
      paragrafos.push({ ...b })
      terminou = true
      continue
    }
    if (b.tipo === 'prosa') {
      for (const parte of preDivide(colapsaEspacoAntesDePontuacao(b.texto))) {
        if (cur.length && terminou && ABRE_PARAGRAFO.test(parte.trimStart())) fecha()
        cur.push({ tipo: 'prosa', texto: parte })
        terminou = terminaFrase(parte)
      }
      continue
    }
    // lacuna — nunca abre parágrafo; sufixo viaja junto no mesmo objeto
    const lac = { ...b }
    if (lac.tamanho === 'linha') {
      if (!LARGURAS[lac.id]) semLargura.push(lac.id)
      lac.largura = LARGURAS[lac.id] ?? 'md'
    }
    cur.push(lac)
    // Sem sufixo: lacuna 'linha' continua a frase (ex.: "o art. ___ condiciona");
    // lacuna 'curto'/'paragrafo' é área multi-linha que encerra a unidade de
    // leitura (ex.: extra-2-l7), então o que vem depois abre parágrafo se maiúsculo.
    terminou = lac.sufixo != null ? sufixoTermina(lac.sufixo) : lac.tamanho !== 'linha'
  }
  fecha()

  return {
    id: sec.id,
    tipo: sec.tipo,
    numero: sec.numero,
    romano: sec.tipo === 'capitulo' ? ROMANOS[sec.numero - 1] : null,
    titulo: sec.titulo,
    ancora: sec.ancora,
    total_lacunas: sec.total_lacunas,
    paragrafos,
  }
}

// ---------------------------------------------------------------- main

const entrada = resolve(process.argv[2] ?? 'src/data/workbook-content.js')
const saida = resolve(process.argv[3] ?? 'src/data/workbook-content.js')

const mod = await import(`${pathToFileURL(entrada).href}?t=${Date.now()}`)
const v1 = mod.WORKBOOK ?? mod.default
if (!Array.isArray(v1) || !v1.length) {
  console.error(`[migrate-v2] entrada inválida: ${entrada}`)
  process.exit(1)
}
if (mod.SCHEMA_VERSAO === 2 || v1[0]?.paragrafos) {
  console.error('[migrate-v2] a entrada já está no schema v2 — nada a fazer.')
  process.exit(1)
}

const v2 = v1.map(migraSecao)

if (semLargura.length) {
  console.warn(
    `[migrate-v2] AVISO: lacunas 'linha' sem largura curada (usei 'md'): ${semLargura.join(', ')}\n` +
      '             → curar no mapa LARGURAS deste script e rodar de novo.'
  )
}

const cabecalho = `// workbook-content.js — FONTE ÚNICA do Workbook de acompanhamento CNHF (schema v2)
// Gerado a partir de "HOLDING TOTAL JULHO 2026 + EXTRAS - TRANSCRIÇÃO LIMPA.pdf"
// e migrado por scripts/migrate-content-v2.mjs.
// NÃO editar parágrafos à mão: ajustar a heurística/curadoria no script e rodar de novo.
//
// Estrutura v2 — cada seção tem \`paragrafos\`, com três formas:
//   { tipo: 'paragrafo', blocos: [prosa|lacuna] }  -> unidade de leitura
//   { tipo: 'subtitulo', texto }                   -> subtítulo interno (block-level)
//   { tipo: 'citacao-legal', id, rotulo, ... }     -> lacuna com rótulo legal (block-level)
// Blocos internos:
//   prosa  -> texto fixo da apostila (conteúdo jurídico — NUNCA alterar;
//             única normalização aplicada, autorizada pelo orquestrador:
//             colapso de espaço antes de , ; . : — artefato da transcrição)
//   lacuna -> campo do aluno (id estável; linhas, tamanho, sufixo, largura)
// tamanho: 'linha' | 'curto' | 'paragrafo' (altura do campo/espaço no PDF)
// largura (só tamanho 'linha'): 'xs'|'sm'|'md'|'lg'|'xl' ≈ 6|10|18|28|40 ch
// romano: numeral romano pré-calculado ('I'…) para capítulos; null para extras.
// Total de lacunas: 149 — os ids são chave primária das respostas salvas no
// Supabase de alunos reais: nunca renomear, remover ou criar ids.
`

const corpo = `${cabecalho}
export const ANCORA = ${JSON.stringify(mod.ANCORA)}
export const SCHEMA_VERSAO = 2

export const WORKBOOK = ${JSON.stringify(v2, null, 2)}

export default WORKBOOK
`

writeFileSync(saida, corpo, 'utf8')

// resumo
let totalParas = 0
for (const s of v2) {
  const pars = s.paragrafos.filter((p) => p.tipo === 'paragrafo')
  const lens = pars.map((p) => prosaLen(p.blocos))
  totalParas += pars.length
  const media = lens.length ? Math.round(lens.reduce((a, b) => a + b, 0) / lens.length) : 0
  console.log(
    `${s.id.padEnd(8)} paragrafos=${String(pars.length).padStart(2)} ` +
      `prosa min/med/max = ${Math.min(...lens)}/${media}/${Math.max(...lens)}`
  )
}
console.log(`[migrate-v2] OK → ${saida} (${v2.length} seções, ${totalParas} parágrafos)`)
