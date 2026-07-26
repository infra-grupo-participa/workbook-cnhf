// book-print.js — gera, no navegador do aluno, o "Meu workbook preenchido" em PDF
// abrindo uma janela de impressão (window.print → Salvar como PDF). Reusa a mesma
// fonte única (WORKBOOK) e o tema CNHF. Sem dependências externas.
import { WORKBOOK, ANCORA } from './workbook-content.js'

const ROMANOS = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII']

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function bloco(b, respostas) {
  if (b.tipo === 'prosa') return `<span class="prosa">${esc(b.texto)} </span>`
  if (b.tipo === 'subtitulo') return `<h3 class="subtitulo">${esc(b.texto)}</h3>`
  const val = respostas[b.id] || ''
  const suf = b.sufixo ? `<span class="suf">${esc(b.sufixo)}</span>` : ''
  if (b.tipo === 'citacao-legal') {
    return `<div class="legal"><span class="legal-rotulo">${esc(b.rotulo)}</span>`
      + `<div class="resp resp-bloco">${esc(val) || '&nbsp;'}</div>${suf}</div>`
  }
  if (b.tamanho === 'linha') {
    return `<span class="resp resp-inline">${esc(val) || '&nbsp;'}</span>${suf}`
  }
  return `<span class="resp resp-bloco">${esc(val) || '&nbsp;'}</span>${suf}`
}

function secao(s, respostas) {
  const label = s.tipo === 'capitulo'
    ? `Capítulo ${ROMANOS[s.numero - 1] || s.numero}`
    : `Seção Extra ${s.numero}`
  const corpo = s.blocos.map(b => bloco(b, respostas)).join('')
  const anc = s.ancora ? `<p class="ancora">${esc(ANCORA)}</p>` : ''
  return `<section class="cap">
    <header class="cap-head"><div class="cap-kicker">${esc(label)}</div>
    <h2 class="cap-titulo">${esc(s.titulo)}</h2></header>
    <div class="cap-corpo">${corpo}</div>${anc}</section>`
}

function sumario() {
  const itens = WORKBOOK.map(s => {
    const label = s.tipo === 'capitulo'
      ? `Capítulo ${ROMANOS[s.numero - 1] || s.numero}` : `Seção Extra ${s.numero}`
    return `<li><span class="sum-num">${esc(label)}</span><span class="sum-tit">${esc(s.titulo)}</span></li>`
  }).join('')
  return `<section class="sumario"><h2 class="sum-h">Sumário</h2><ol class="sum-lista">${itens}</ol></section>`
}

const CSS = `
@page{ size:A4; margin:20mm 18mm 18mm 18mm } @page:first{ margin:0 }
*{box-sizing:border-box}
body{margin:0;font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
  color:#1b1b1f;font-size:11.2pt;line-height:1.62;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.capa{height:297mm;display:flex;flex-direction:column;justify-content:space-between;
  padding:24mm 22mm;page-break-after:always;border-top:10mm solid #E8791E;
  background:linear-gradient(180deg,#fff,#faf7f2)}
.capa-logo{height:22mm}
.capa-selo{font-size:12pt;letter-spacing:.14em;text-transform:uppercase;color:#C25E10;font-weight:600;
  font-family:Arial,sans-serif;margin-bottom:8mm;border-left:3px solid #E8791E;padding-left:5mm}
.capa-titulo{font-size:56pt;margin:0;line-height:1}
.capa-sub{font-size:15pt;color:#3a3a42;margin:5mm 0 0}
.capa-rod{display:flex;justify-content:space-between;font-family:Arial,sans-serif;font-size:9.5pt;
  color:#3a3a42;border-top:1px solid #c9ccd2;padding-top:5mm}
.capa-tag{color:#C25E10;font-style:italic;font-family:Georgia,serif}
.sumario{page-break-after:always;padding-top:6mm}
.sum-h{font-size:24pt;color:#C25E10;margin:0 0 8mm;font-family:Arial,sans-serif}
.sum-lista{list-style:none;margin:0;padding:0}
.sum-lista li{display:flex;gap:6mm;padding:3mm 0;border-bottom:1px dotted #c9ccd2}
.sum-num{flex:0 0 42mm;font-family:Arial,sans-serif;font-size:10pt;font-weight:600;color:#C25E10;
  text-transform:uppercase;letter-spacing:.04em}
.sum-tit{font-size:12.5pt}
.cap{page-break-before:always}
.cap-head{margin-bottom:7mm;padding-bottom:4mm;border-bottom:2px solid #E8791E}
.cap-kicker{font-family:Arial,sans-serif;font-size:10pt;font-weight:700;letter-spacing:.16em;
  text-transform:uppercase;color:#E8791E;margin-bottom:2mm}
.cap-titulo{font-size:22pt;line-height:1.15;margin:0}
.cap-corpo{text-align:justify}
.subtitulo{font-family:Arial,sans-serif;font-size:12.5pt;font-weight:700;color:#C25E10;
  text-transform:uppercase;letter-spacing:.05em;margin:7mm 0 3mm;text-align:left;break-after:avoid}
.resp{color:#C25E10;font-style:italic}
.resp-inline{border-bottom:1px solid #c9ccd2;padding:0 2px}
.resp-bloco{display:block;margin:2mm 0;padding:2mm 3mm;background:#faf7f2;
  border-left:2px solid #E8791E;white-space:pre-wrap}
.suf{color:#1b1b1f;font-style:normal}
.legal{margin:4mm 0;padding:3.5mm 4mm;background:#faf7f2;border-left:3px solid #E8791E;break-inside:avoid}
.legal-rotulo{display:block;font-family:Arial,sans-serif;font-size:9.5pt;font-weight:700;
  letter-spacing:.06em;text-transform:uppercase;color:#C25E10;margin-bottom:2mm}
.ancora{margin-top:9mm;text-align:center;font-style:italic;font-size:13pt;color:#C25E10;break-before:avoid}
`

/**
 * imprimeWorkbook — abre uma janela com o workbook preenchido e chama print().
 * @param {object} respostas  { "cap-1-l1": "texto", ... }
 * @param {string} [aluno]    nome exibido na capa
 * @param {string} [logoUrl]  URL do logo (default: /logo-cnhf.png servido pelo app)
 */
export function imprimeWorkbook(respostas = {}, aluno = '', logoUrl = 'logo-cnhf.png') {
  const capas = WORKBOOK.map(s => secao(s, respostas)).join('')
  const sub = 'Meu workbook' + (aluno ? ' — ' + esc(aluno) : '')
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Workbook CNHF — ${esc(aluno) || 'preenchido'}</title><style>${CSS}</style></head>
<body>
  <section class="capa">
    <img class="capa-logo" src="${esc(logoUrl)}" alt="CNHF">
    <div>
      <div class="capa-selo">Curso Nacional de Formação em Holding Familiar</div>
      <h1 class="capa-titulo">Workbook</h1><p class="capa-sub">${sub}</p>
    </div>
    <div class="capa-rod"><span>Holding Total</span>
      <span class="capa-tag">${esc(ANCORA)}</span></div>
  </section>
  ${sumario()}
  ${capas}
</body></html>`

  const win = window.open('', '_blank')
  if (!win) return { ok: false, code: 'POPUP_BLOQUEADO' }
  win.document.open(); win.document.write(html); win.document.close()
  // espera o logo carregar antes de imprimir
  const go = () => { try { win.focus(); win.print() } catch (e) {} }
  const img = win.document.querySelector('.capa-logo')
  if (img && !img.complete) { img.onload = go; img.onerror = go; setTimeout(go, 1500) }
  else setTimeout(go, 300)
  return { ok: true }
}
