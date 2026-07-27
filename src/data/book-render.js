// book-render.js — FONTE ÚNICA do livro impresso do Workbook CNHF (schema v2).
// Consumido por DOIS caminhos:
//   1. src/data/book-print.js  → browser: "Baixar meu workbook em PDF" (window.print)
//   2. scripts/book-template.mjs + scripts/build-book.mjs → Node + Chrome headless
// ESM puro: sem Vue, sem window/document, sem Node API. `logo` chega pronto
// (URL no browser, data-URI no Node).
//
// Variantes:
//   'preenchido' — respostas do aluno impressas; vazias viram linha em branco.
//   'branco'     — linhas pautadas para escrever à mão (apostila da aula).
//
// Tipografia de impresso (Chrome ≥131 p/ margin boxes de @page):
//   - fólio (número de página) em @bottom-center; nada na capa nem no sumário;
//   - cabeçalho corrente por seção via named pages (capítulo à esq., título à dir.);
//   - parágrafo com indent a partir do segundo; capitular na abertura do capítulo;
//   - orphans/widows 3; títulos não órfãos; citação legal não quebra no meio;
//   - sumário: com nº de página quando `paginas` é fornecido (build Node mede em
//     duas passadas); sem nº no browser (uma passada não tem como medir).

import { ANCORA } from './workbook-content.js'

// largura das lacunas inline (tamanho:'linha')
export const LARGURAS_CH = { xs: 6, sm: 10, md: 18, lg: 28, xl: 40 }        // texto digitado
export const LARGURAS_MM = { xs: 16, sm: 24, md: 38, lg: 58, xl: 80 }       // escrita à mão (branco)

const LINHAS_PADRAO = { linha: 1, curto: 2, paragrafo: 4 }
const ALTURA_LINHA_EM = 1.62 // = line-height do corpo

// REGRA DE SEGURANÇA DO ARQUIVO: nenhuma interpolação \${} de dado (conteúdo,
// resposta, aluno, logo) sem escapeHtml/escCss NO PRÓPRIO ponto de interpolação
// — nunca escapar "à distância" e interpolar a variável já processada.
// Regressão coberta por scripts/test-book-render.mjs.
export function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// string segura dentro de content:"…" no CSS (quebra de linha encerraria a
// string e permitiria injetar declarações/regras)
function escCss(s) {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    .replace(/[\r\n\f\v\u2028\u2029]+/g, ' ')
}

function linhasDe(b) {
  if (b.linhas && b.linhas > 0) return b.linhas
  return LINHAS_PADRAO[b.tamanho] || 1
}

// aceita string crua e envelope { v, t } (formato do store local-first)
function valorResposta(respostas, id) {
  const v = respostas ? respostas[id] : ''
  if (v == null) return ''
  if (typeof v === 'object') return String(v.v == null ? '' : v.v)
  return String(v)
}

function rotuloSecao(sec) {
  return sec.tipo === 'capitulo'
    ? `Capítulo ${sec.romano || sec.numero}`
    : `Seção Extra ${sec.numero}`
}

// título curto p/ cabeçalho corrente: corta no " — " e limita a 48 chars
function tituloCorrente(sec) {
  let t = String(sec.titulo || '').split(' — ')[0]
  if (t.length > 48) t = t.slice(0, 47).replace(/\s+\S*$/, '') + '…'
  return t
}

/* ---------------- blocos ---------------- */

// linhas pautadas; o sufixo (pontuação) entra no fim da ÚLTIMA linha, nunca
// numa linha própria — um "." órfão em linha solta é erro tipográfico visível
function linhasPautadas(n, sufixo, tag) {
  const sufIn = sufixo ? `<span class="ln-suf">${escapeHtml(sufixo)}</span>` : ''
  return `<${tag} class="ln"></${tag}>`.repeat(n - 1)
    + `<${tag} class="ln">${sufIn}</${tag}>`
}

function blocoInline(b, variante, respostas) {
  if (b.tipo === 'prosa') return `<span class="prosa">${escapeHtml(b.texto)}</span>`
  // lacuna
  const suf = b.sufixo ? `<span class="suf">${escapeHtml(b.sufixo)}</span>` : ''
  const n = linhasDe(b)
  const lg = b.largura && LARGURAS_CH[b.largura] ? ` lg-${b.largura}` : ' lg-md'

  if (variante === 'branco') {
    if (b.tamanho === 'linha') return `<span class="gap-inline${lg}"></span>${suf}`
    return `<span class="gap-block"><span class="linhas">${linhasPautadas(n, b.sufixo, 'span')}</span></span>`
  }
  // preenchido
  const val = valorResposta(respostas, b.id)
  if (b.tamanho === 'linha') {
    return `<span class="resp resp-inline${lg}">${escapeHtml(val) || '&nbsp;'}</span>${suf}`
  }
  const minH = (n * ALTURA_LINHA_EM).toFixed(2)
  return `<span class="resp resp-bloco" style="min-height:${minH}em">${escapeHtml(val) || '&nbsp;'}${suf}</span>`
}

function citacaoLegal(b, variante, respostas) {
  const n = linhasDe(b)
  const suf = b.sufixo ? `<span class="suf">${escapeHtml(b.sufixo)}</span>` : ''
  const rot = `<span class="legal-rotulo">${escapeHtml(b.rotulo)}</span>`
  if (variante === 'branco') {
    return `<div class="legal">${rot}<div class="linhas">${linhasPautadas(n, b.sufixo, 'div')}</div></div>`
  }
  const val = valorResposta(respostas, b.id)
  const minH = (n * ALTURA_LINHA_EM).toFixed(2)
  return `<div class="legal">${rot}<div class="resp resp-bloco" style="min-height:${minH}em">${escapeHtml(val) || '&nbsp;'}${suf}</div></div>`
}

/* ---------------- seções ---------------- */

function renderSecao(sec, variante, respostas) {
  let abriu = false // primeiro parágrafo de prosa recebe a capitular
  const corpo = sec.paragrafos.map(p => {
    if (p.tipo === 'subtitulo') return `<h3 class="subtitulo">${escapeHtml(p.texto)}</h3>`
    if (p.tipo === 'citacao-legal') return citacaoLegal(p, variante, respostas)
    // p.tipo === 'paragrafo'
    const pedacos = p.blocos.map(b => blocoInline(b, variante, respostas)).join(' ')
    let cls = 'par'
    if (!abriu && p.blocos[0] && p.blocos[0].tipo === 'prosa') { cls += ' par-abre'; abriu = true }
    return `<div class="${cls}">${pedacos}</div>`
  }).join('\n')

  const anc = sec.ancora ? `<p class="ancora">${escapeHtml(ANCORA)}</p>` : ''
  return `<section class="cap pg-${sec.id}">
  <header class="cap-head">
    <div class="cap-kicker">${escapeHtml(rotuloSecao(sec))}</div>
    <h2 class="cap-titulo">${escapeHtml(sec.titulo)}</h2>
  </header>
  <div class="cap-corpo">${corpo}</div>
  ${anc}
</section>`
}

function renderSumario(secoes, paginas) {
  const itens = secoes.map(s => {
    const label = `<span class="sum-num">${escapeHtml(rotuloSecao(s))}</span>`
    const tit = `<span class="sum-tit">${escapeHtml(s.titulo)}</span>`
    if (paginas && paginas[s.id] != null) {
      return `<li class="sum-li com-pag">${label}${tit}<span class="sum-fio"></span><span class="sum-pag">${escapeHtml(paginas[s.id])}</span></li>`
    }
    return `<li class="sum-li">${label}${tit}</li>`
  }).join('')
  return `<section class="sumario"><h2 class="sum-h">Sumário</h2><ol class="sum-lista">${itens}</ol></section>`
}

// recebe o subtítulo CRU e escapa aqui, no ponto de interpolação
function renderCapa(logo, subtitulo) {
  return `<section class="capa">
  <div class="capa-top"><img class="capa-logo" src="${escapeHtml(logo)}" alt="CNHF"></div>
  <div class="capa-centro">
    <div class="capa-selo">Curso Nacional de Formação em Holding Familiar</div>
    <h1 class="capa-titulo">Workbook</h1>
    <p class="capa-sub">${escapeHtml(subtitulo)}</p>
  </div>
  <div class="capa-rodape"><span>Holding Total</span><span class="capa-tag">${escapeHtml(ANCORA)}</span></div>
</section>`
}

/* ---------------- CSS ---------------- */

function montarCss(secoes) {
  // cabeçalho corrente por seção via named pages (Chrome ≥131).
  // Em engines sem margin boxes a página sai limpa — degrada sem quebrar layout.
  const paginasNomeadas = secoes.map(sec => {
    const esq = escCss(rotuloSecao(sec).toUpperCase())
    const dir = escCss(tituloCorrente(sec))
    return `@page pg-${sec.id}{
  @top-left{ content:"${esq}"; font:8pt "Helvetica Neue",Arial,sans-serif; letter-spacing:.14em; color:#8a8f98 }
  @top-right{ content:"${dir}"; font:italic 9pt Georgia,serif; color:#8a8f98 }
}
.pg-${sec.id}{ page:pg-${sec.id} }`
  }).join('\n')

  return `
:root{ --laranja:#E8791E; --laranja-esc:#C25E10; --tinta:#1b1b1f; --tinta-suave:#3a3a42;
  --linha:#c9ccd2; --papel:#fff; --creme:#faf7f2 }
*{box-sizing:border-box}
@page{ size:A4; margin:22mm 18mm 18mm;
  @bottom-center{ content:counter(page); font:9pt "Helvetica Neue",Arial,sans-serif; color:#8a8f98 } }
@page capa{ margin:0; @bottom-center{ content:none } }
@page frente{ @bottom-center{ content:none } }
${paginasNomeadas}
html,body{margin:0;padding:0}
body{ font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Times New Roman",serif;
  color:var(--tinta); font-size:11.2pt; line-height:${ALTURA_LINHA_EM}; background:var(--papel);
  -webkit-print-color-adjust:exact; print-color-adjust:exact }
/* ---------- capa ---------- */
.capa{ page:capa; height:297mm; width:100%; break-after:page; position:relative;
  display:flex; flex-direction:column; justify-content:space-between; padding:24mm 22mm;
  background: radial-gradient(120% 80% at 100% 0%, rgba(232,121,30,.10), transparent 60%),
    linear-gradient(180deg,#fff 0%,var(--creme) 100%);
  border-top:10mm solid var(--laranja) }
.capa-top{display:flex;justify-content:flex-start}
.capa-logo{height:22mm;width:auto}
.capa-centro{margin-top:auto;margin-bottom:auto}
.capa-selo{ font-size:12pt;letter-spacing:.14em;text-transform:uppercase;color:var(--laranja-esc);
  font-weight:600;font-family:"Helvetica Neue",Arial,sans-serif;margin-bottom:8mm;
  border-left:3px solid var(--laranja);padding-left:5mm }
.capa-titulo{font-size:56pt;line-height:1;margin:0;color:var(--tinta);letter-spacing:-.01em}
.capa-sub{font-size:15pt;color:var(--tinta-suave);margin:5mm 0 0}
.capa-rodape{ display:flex;justify-content:space-between;align-items:center;
  font-family:"Helvetica Neue",Arial,sans-serif;font-size:9.5pt;color:var(--tinta-suave);
  border-top:1px solid var(--linha);padding-top:5mm }
.capa-tag{color:var(--laranja-esc);font-style:italic;font-family:Georgia,serif}
/* ---------- sumário ---------- */
.sumario{ page:frente; break-after:page; padding-top:6mm }
.sum-h{font-size:24pt;color:var(--laranja-esc);margin:0 0 8mm;
  font-family:"Helvetica Neue",Arial,sans-serif;letter-spacing:.02em}
.sum-lista{list-style:none;margin:0;padding:0}
.sum-li{display:flex;gap:5mm;align-items:baseline;padding:3.2mm 0;border-bottom:1px dotted var(--linha)}
.sum-li.com-pag{border-bottom:none}
.sum-num{flex:0 0 38mm;font-family:"Helvetica Neue",Arial,sans-serif;font-size:9.5pt;
  font-weight:600;color:var(--laranja-esc);text-transform:uppercase;letter-spacing:.04em}
.sum-tit{font-size:12pt;color:var(--tinta)}
.sum-fio{flex:1 1 auto;min-width:8mm;border-bottom:1px dotted #b9bdc4;height:.72em;margin:0 1mm}
.sum-pag{font-family:"Helvetica Neue",Arial,sans-serif;font-size:10pt;min-width:3ch;
  text-align:right;color:var(--tinta-suave);font-variant-numeric:tabular-nums}
/* ---------- capítulos ---------- */
.cap{break-before:page}
.cap-head{margin-bottom:7mm;padding-bottom:4mm;border-bottom:2px solid var(--laranja);
  break-after:avoid;break-inside:avoid}
.cap-kicker{font-family:"Helvetica Neue",Arial,sans-serif;font-size:10pt;font-weight:700;
  letter-spacing:.16em;text-transform:uppercase;color:var(--laranja);margin-bottom:2mm}
.cap-titulo{font-size:22pt;line-height:1.15;margin:0;color:var(--tinta)}
.cap-corpo{text-align:justify;hyphens:auto}
/* parágrafos de livro: sem espaço vertical, indent a partir do segundo */
.par{margin:0;orphans:3;widows:3}
.par + .par{text-indent:1.55em}
/* capitular na abertura do capítulo */
.par-abre::first-letter{ initial-letter:3 3; color:var(--laranja-esc); padding-right:.08em; font-weight:500 }
.subtitulo{font-family:"Helvetica Neue",Arial,sans-serif;font-size:12.5pt;font-weight:700;
  color:var(--laranja-esc);text-transform:uppercase;letter-spacing:.05em;
  margin:7mm 0 3mm;text-align:left;break-after:avoid;break-inside:avoid}
/* ---------- lacunas (variante branco) ---------- */
.gap-inline{display:inline-block;border-bottom:1px solid var(--tinta);
  margin:0 2px;vertical-align:baseline;height:1.05em}
.gap-inline.lg-xs{min-width:${LARGURAS_MM.xs}mm} .gap-inline.lg-sm{min-width:${LARGURAS_MM.sm}mm}
.gap-inline.lg-md{min-width:${LARGURAS_MM.md}mm} .gap-inline.lg-lg{min-width:${LARGURAS_MM.lg}mm}
.gap-inline.lg-xl{min-width:${LARGURAS_MM.xl}mm}
.gap-block{display:block;margin:2.5mm 0;text-indent:0}
.gap-block .linhas{display:block}
.gap-block .ln{display:block;height:8.4mm;border-bottom:1px solid var(--linha)}
.ln{position:relative}
.ln-suf{position:absolute;right:0;bottom:0;color:var(--tinta);font-style:normal}
/* ---------- respostas (variante preenchido) ---------- */
.resp{color:var(--laranja-esc);font-style:italic}
.resp-inline{border-bottom:1px solid var(--linha);padding:0 2px;display:inline}
.resp-inline.lg-xs{display:inline-block;min-width:${LARGURAS_CH.xs}ch}
.resp-inline.lg-sm{display:inline-block;min-width:${LARGURAS_CH.sm}ch}
.resp-inline.lg-md{display:inline-block;min-width:${LARGURAS_CH.md}ch}
.resp-inline.lg-lg{display:inline-block;min-width:${LARGURAS_CH.lg}ch}
.resp-inline.lg-xl{display:inline-block;min-width:${LARGURAS_CH.xl}ch}
.resp-bloco{display:block;margin:2mm 0;padding:2mm 3mm;background:var(--creme);
  border-left:2px solid var(--laranja);white-space:pre-wrap;text-indent:0;
  orphans:3;widows:3}
.suf{color:var(--tinta);font-style:normal}
/* ---------- citação legal ---------- */
.legal{margin:4mm 0;padding:3.5mm 4mm;background:var(--creme);
  border-left:3px solid var(--laranja);break-inside:avoid;text-indent:0}
.legal-rotulo{display:block;font-family:"Helvetica Neue",Arial,sans-serif;font-size:9.5pt;
  font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--laranja-esc);
  margin-bottom:2mm}
.legal .linhas .ln{height:8.4mm;border-bottom:1px solid var(--linha)}
.legal .resp-bloco{margin:0;border-left:none;padding:0;background:transparent}
/* ---------- âncora ---------- */
.ancora{margin-top:9mm;text-align:center;font-style:italic;font-size:13pt;
  color:var(--laranja-esc);break-inside:avoid}
.ancora::before,.ancora::after{content:"—";margin:0 3mm;color:var(--laranja);font-style:normal}
`
}

/* ---------------- API ---------------- */

/**
 * renderizarLivro — devolve o documento HTML completo (string) do livro.
 * @param {object[]} opts.WORKBOOK   seções no schema v2 (sec.paragrafos)
 * @param {object}   [opts.respostas] { id: string } ou { id: {v,t} } (envelope do store)
 * @param {string}   [opts.aluno]     nome na capa (variante preenchido)
 * @param {string}   [opts.logo]      URL (browser) ou data-URI (Node)
 * @param {string}   [opts.variante]  'preenchido' | 'branco'
 * @param {object}   [opts.paginas]   { secId: número } — nº de página no sumário
 *                                    (medido pelo build Node em duas passadas)
 * @param {object}   [opts.partes]    { capa, sumario, secoes:[ids]|null } — subconjunto
 *                                    do documento (usado pela medição do build)
 */
export function renderizarLivro({
  WORKBOOK, respostas = {}, aluno = '', logo = '/logo-cnhf.png',
  variante = 'preenchido', paginas = null, partes = null,
}) {
  const p = { capa: true, sumario: true, secoes: null, ...(partes || {}) }
  const secoes = p.secoes ? WORKBOOK.filter(s => p.secoes.includes(s.id)) : WORKBOOK

  // valor CRU — quem escapa é renderCapa, no ponto de interpolação (regra de
  // segurança do topo do arquivo). Escapar aqui também produziria escape duplo:
  // "D'Ávila" sairia impresso como "D&#39;Ávila" na capa.
  const subtitulo = variante === 'preenchido'
    ? 'Meu workbook' + (aluno ? ' — ' + aluno : '')
    : 'Caderno de acompanhamento'

  const corpo = [
    p.capa ? renderCapa(logo, subtitulo) : '',
    p.sumario ? renderSumario(WORKBOOK, paginas) : '',
    secoes.map(s => renderSecao(s, variante, respostas)).join('\n'),
  ].join('\n')

  const titulo = 'Workbook CNHF — ' + (variante === 'preenchido' ? (aluno || 'preenchido') : 'Holding Familiar')
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>${escapeHtml(titulo)}</title>
<style>${montarCss(WORKBOOK)}</style>
</head><body>
${corpo}
</body></html>`
}
