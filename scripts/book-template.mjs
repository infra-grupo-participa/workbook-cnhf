// book-template.mjs — monta o HTML do PDF-livro (apostila) a partir da fonte única.
// Duas variantes: 'branco' (linhas p/ preencher à mão) e 'preenchido' (respostas do aluno).
// Sem dependências externas: recebe WORKBOOK + logoDataUri e devolve string HTML.

import { escapeHtml } from './book-utils.mjs'

const ROMANOS = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII']

// altura (em nº de linhas de escrita) por tamanho de lacuna
const LINHAS = { linha: 1, curto: 2, paragrafo: 4 }

function linhasDe(bloco) {
  if (bloco.linhas && bloco.linhas > 0) return bloco.linhas
  return LINHAS[bloco.tamanho] || 1
}

// ---- render de um bloco na variante EM BRANCO ----
function blocoBranco(b) {
  if (b.tipo === 'prosa') return `<span class="prosa">${escapeHtml(b.texto)}</span>`
  if (b.tipo === 'subtitulo') return `<h3 class="subtitulo">${escapeHtml(b.texto)}</h3>`
  const n = linhasDe(b)
  const suf = b.sufixo ? `<span class="suf">${escapeHtml(b.sufixo)}</span>` : ''
  if (b.tipo === 'citacao-legal') {
    return `<div class="legal"><span class="legal-rotulo">${escapeHtml(b.rotulo)}</span>`
      + `<div class="linhas">${'<div class="ln"></div>'.repeat(n)}</div>${suf}</div>`
  }
  // lacuna
  if (b.tamanho === 'linha') {
    // lacuna inline curta: sublinhado no fluxo do texto
    return `<span class="gap-inline"></span>${suf}`
  }
  return `<span class="gap-block"><span class="linhas">${'<span class="ln"></span>'.repeat(n)}</span>${suf}</span>`
}

// ---- render de um bloco na variante PREENCHIDA (respostas do aluno) ----
function blocoPreenchido(b, respostas) {
  if (b.tipo === 'prosa') return `<span class="prosa">${escapeHtml(b.texto)}</span>`
  if (b.tipo === 'subtitulo') return `<h3 class="subtitulo">${escapeHtml(b.texto)}</h3>`
  const val = (respostas && respostas[b.id]) ? respostas[b.id] : ''
  const suf = b.sufixo ? `<span class="suf">${escapeHtml(b.sufixo)}</span>` : ''
  if (b.tipo === 'citacao-legal') {
    return `<div class="legal"><span class="legal-rotulo">${escapeHtml(b.rotulo)}</span>`
      + `<div class="resp resp-bloco">${escapeHtml(val) || '&nbsp;'}</div>${suf}</div>`
  }
  if (b.tamanho === 'linha') {
    return `<span class="resp resp-inline">${escapeHtml(val) || '&nbsp;'}</span>${suf}`
  }
  return `<span class="resp resp-bloco">${escapeHtml(val) || '&nbsp;'}</span>${suf}`
}

function renderSecao(sec, i, variante, respostas) {
  const numLabel = sec.tipo === 'capitulo'
    ? `Capítulo ${ROMANOS[sec.numero - 1] || sec.numero}`
    : `Seção Extra ${sec.numero}`
  const blocosHtml = sec.blocos.map(b =>
    variante === 'preenchido' ? blocoPreenchido(b, respostas) : blocoBranco(b)
  ).join('')
  const ancora = sec.ancora
    ? `<p class="ancora">Holding Familiar é método, não é improviso!</p>` : ''
  return `
  <section class="cap">
    <header class="cap-head">
      <div class="cap-kicker">${escapeHtml(numLabel)}</div>
      <h2 class="cap-titulo">${escapeHtml(sec.titulo)}</h2>
    </header>
    <div class="cap-corpo">${blocosHtml}</div>
    ${ancora}
  </section>`
}

function sumario(secoes) {
  const itens = secoes.map(s => {
    const label = s.tipo === 'capitulo'
      ? `Capítulo ${ROMANOS[s.numero - 1] || s.numero}`
      : `Seção Extra ${s.numero}`
    return `<li><span class="sum-num">${escapeHtml(label)}</span>`
      + `<span class="sum-tit">${escapeHtml(s.titulo)}</span></li>`
  }).join('')
  return `<section class="sumario">
    <h2 class="sum-h">Sumário</h2>
    <ol class="sum-lista">${itens}</ol>
  </section>`
}

export function montarLivro({ WORKBOOK, logoDataUri, variante = 'branco', respostas = null, aluno = null }) {
  const capas = WORKBOOK.map((s, i) => renderSecao(s, i, variante, respostas)).join('')
  const subtitulo = variante === 'preenchido'
    ? `Workbook preenchido${aluno ? ' — ' + escapeHtml(aluno) : ''}`
    : 'Caderno de acompanhamento'
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Workbook CNHF — Holding Familiar</title>
<style>${CSS}</style>
</head><body>
  <section class="capa">
    <div class="capa-top">
      <img class="capa-logo" src="${logoDataUri}" alt="CNHF">
    </div>
    <div class="capa-centro">
      <div class="capa-selo">Curso Nacional de Formação em Holding Familiar</div>
      <h1 class="capa-titulo">Workbook</h1>
      <p class="capa-sub">${subtitulo}</p>
    </div>
    <div class="capa-rodape">
      <span>Holding Total</span><span class="capa-tag">Holding Familiar é método, não é improviso!</span>
    </div>
  </section>
  ${sumario(WORKBOOK)}
  ${capas}
</body></html>`
}

const CSS = `
:root{
  --laranja:#E8791E; --laranja-esc:#C25E10; --tinta:#1b1b1f; --tinta-suave:#3a3a42;
  --linha:#c9ccd2; --papel:#ffffff; --creme:#faf7f2;
}
*{box-sizing:border-box}
@page{ size:A4; margin:20mm 18mm 18mm 18mm; }
@page:first{ margin:0; }
html,body{margin:0;padding:0}
body{
  font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Times New Roman",serif;
  color:var(--tinta); font-size:11.2pt; line-height:1.62; background:var(--papel);
  -webkit-print-color-adjust:exact; print-color-adjust:exact;
}
/* ---------- CAPA ---------- */
.capa{
  height:297mm; width:100%; page-break-after:always; position:relative;
  display:flex; flex-direction:column; justify-content:space-between;
  padding:24mm 22mm; background:
    radial-gradient(120% 80% at 100% 0%, rgba(232,121,30,.10), transparent 60%),
    linear-gradient(180deg,#fff 0%,var(--creme) 100%);
  border-top:10mm solid var(--laranja);
}
.capa-top{display:flex;justify-content:flex-start}
.capa-logo{height:22mm;width:auto}
.capa-centro{margin-top:auto;margin-bottom:auto}
.capa-selo{
  font-size:12pt;letter-spacing:.14em;text-transform:uppercase;color:var(--laranja-esc);
  font-weight:600;font-family:"Helvetica Neue",Arial,sans-serif;margin-bottom:8mm;
  border-left:3px solid var(--laranja);padding-left:5mm;
}
.capa-titulo{
  font-size:58pt;line-height:1;margin:0;color:var(--tinta);letter-spacing:-.01em;
}
.capa-sub{font-size:15pt;color:var(--tinta-suave);margin:5mm 0 0}
.capa-rodape{
  display:flex;justify-content:space-between;align-items:center;
  font-family:"Helvetica Neue",Arial,sans-serif;font-size:9.5pt;color:var(--tinta-suave);
  border-top:1px solid var(--linha);padding-top:5mm;
}
.capa-tag{color:var(--laranja-esc);font-style:italic;font-family:Georgia,serif}
/* ---------- SUMÁRIO ---------- */
.sumario{page-break-after:always;padding-top:6mm}
.sum-h{font-size:24pt;color:var(--laranja-esc);margin:0 0 8mm;
  font-family:"Helvetica Neue",Arial,sans-serif;letter-spacing:.02em}
.sum-lista{list-style:none;margin:0;padding:0;counter-reset:s}
.sum-lista li{display:flex;gap:6mm;align-items:baseline;padding:3.2mm 0;
  border-bottom:1px dotted var(--linha)}
.sum-num{flex:0 0 42mm;font-family:"Helvetica Neue",Arial,sans-serif;font-size:10pt;
  font-weight:600;color:var(--laranja-esc);text-transform:uppercase;letter-spacing:.04em}
.sum-tit{font-size:12.5pt;color:var(--tinta)}
/* ---------- CAPÍTULOS ---------- */
.cap{page-break-before:always}
.cap-head{margin-bottom:7mm;padding-bottom:4mm;border-bottom:2px solid var(--laranja)}
.cap-kicker{font-family:"Helvetica Neue",Arial,sans-serif;font-size:10pt;font-weight:700;
  letter-spacing:.16em;text-transform:uppercase;color:var(--laranja);margin-bottom:2mm}
.cap-titulo{font-size:22pt;line-height:1.15;margin:0;color:var(--tinta)}
.cap-corpo{text-align:justify;hyphens:auto}
.prosa{}
.subtitulo{font-family:"Helvetica Neue",Arial,sans-serif;font-size:12.5pt;font-weight:700;
  color:var(--laranja-esc);text-transform:uppercase;letter-spacing:.05em;
  margin:7mm 0 3mm;text-align:left;break-after:avoid}
/* ---------- LACUNAS (variante branco) ---------- */
.gap-inline{display:inline-block;min-width:34mm;border-bottom:1px solid var(--tinta);
  margin:0 2px;vertical-align:baseline;height:1.05em}
.gap-block{display:block;margin:2.5mm 0}
.gap-block .linhas{display:block}
.gap-block .ln{display:block;height:8.4mm;border-bottom:1px solid var(--linha)}
.suf{color:var(--tinta)}
.legal{margin:4mm 0;padding:3.5mm 4mm;background:var(--creme);
  border-left:3px solid var(--laranja);break-inside:avoid}
.legal-rotulo{display:block;font-family:"Helvetica Neue",Arial,sans-serif;font-size:9.5pt;
  font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--laranja-esc);
  margin-bottom:2mm}
.legal .linhas .ln{height:8.4mm;border-bottom:1px solid var(--linha)}
/* ---------- RESPOSTAS (variante preenchido) ---------- */
.resp{color:var(--laranja-esc);font-style:italic}
.resp-inline{border-bottom:1px solid var(--linha);padding:0 2px}
.resp-bloco{display:block;margin:2mm 0;padding:2mm 3mm;background:var(--creme);
  border-left:2px solid var(--laranja);white-space:pre-wrap}
/* ---------- ÂNCORA ---------- */
.ancora{margin-top:9mm;text-align:center;font-style:italic;font-size:13pt;
  color:var(--laranja-esc);break-before:avoid}
.ancora::before,.ancora::after{content:"—";margin:0 3mm;color:var(--laranja);font-style:normal}
`
