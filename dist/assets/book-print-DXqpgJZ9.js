import{A as b,W as w}from"./workbook-content-esHdE6Ti.js";const c={xs:6,sm:10,md:18,lg:28,xl:40},p={xs:16,sm:24,md:38,lg:58,xl:80},j={linha:1,curto:2,paragrafo:4},g=1.62;function r(a){return String(a??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function h(a){return String(a??"").replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/[\r\n\f\v\u2028\u2029]+/g," ")}function v(a){return a.linhas&&a.linhas>0?a.linhas:j[a.tamanho]||1}function $(a,e){const t=a?a[e]:"";return t==null?"":String(typeof t=="object"?t.v==null?"":t.v:t)}function f(a){return a.tipo==="capitulo"?`Capítulo ${a.romano||a.numero}`:`Seção Extra ${a.numero}`}function A(a){let e=String(a.titulo||"").split(" — ")[0];return e.length>48&&(e=e.slice(0,47).replace(/\s+\S*$/,"")+"…"),e}function x(a,e,t){const i=e?`<span class="ln-suf">${r(e)}</span>`:"";return`<${t} class="ln"></${t}>`.repeat(a-1)+`<${t} class="ln">${i}</${t}>`}function H(a,e,t){if(a.tipo==="prosa")return`<span class="prosa">${r(a.texto)}</span>`;const i=a.sufixo?`<span class="suf">${r(a.sufixo)}</span>`:"",n=v(a),l=a.largura&&c[a.largura]?` lg-${a.largura}`:" lg-md";if(e==="branco")return a.tamanho==="linha"?`<span class="gap-inline${l}"></span>${i}`:`<span class="gap-block"><span class="linhas">${x(n,a.sufixo,"span")}</span></span>`;const o=$(t,a.id);return a.tamanho==="linha"?`<span class="resp resp-inline${l}">${r(o)||"&nbsp;"}</span>${i}`:`<span class="resp resp-bloco" style="min-height:${(n*g).toFixed(2)}em">${r(o)||"&nbsp;"}${i}</span>`}function N(a,e,t){const i=v(a),n=a.sufixo?`<span class="suf">${r(a.sufixo)}</span>`:"",l=`<span class="legal-rotulo">${r(a.rotulo)}</span>`;if(e==="branco")return`<div class="legal">${l}<div class="linhas">${x(i,a.sufixo,"div")}</div></div>`;const o=$(t,a.id),s=(i*g).toFixed(2);return`<div class="legal">${l}<div class="resp resp-bloco" style="min-height:${s}em">${r(o)||"&nbsp;"}${n}</div></div>`}function z(a,e,t){let i=!1;const n=a.paragrafos.map(o=>{if(o.tipo==="subtitulo")return`<h3 class="subtitulo">${r(o.texto)}</h3>`;if(o.tipo==="citacao-legal")return N(o,e,t);const s=o.blocos.map(d=>H(d,e,t)).join(" ");let m="par";return!i&&o.blocos[0]&&o.blocos[0].tipo==="prosa"&&(m+=" par-abre",i=!0),`<div class="${m}">${s}</div>`}).join(`
`),l=a.ancora?`<p class="ancora">${r(b)}</p>`:"";return`<section class="cap pg-${a.id}">
  <header class="cap-head">
    <div class="cap-kicker">${r(f(a))}</div>
    <h2 class="cap-titulo">${r(a.titulo)}</h2>
  </header>
  <div class="cap-corpo">${n}</div>
  ${l}
</section>`}function S(a,e){return`<section class="sumario"><h2 class="sum-h">Sumário</h2><ol class="sum-lista">${a.map(i=>{const n=`<span class="sum-num">${r(f(i))}</span>`,l=`<span class="sum-tit">${r(i.titulo)}</span>`;return e&&e[i.id]!=null?`<li class="sum-li com-pag">${n}${l}<span class="sum-fio"></span><span class="sum-pag">${r(e[i.id])}</span></li>`:`<li class="sum-li">${n}${l}</li>`}).join("")}</ol></section>`}function C(a,e){return`<section class="capa">
  <div class="capa-top"><img class="capa-logo" src="${r(a)}" alt="CNHF"></div>
  <div class="capa-centro">
    <div class="capa-selo">Curso Nacional de Formação em Holding Familiar</div>
    <h1 class="capa-titulo">Workbook</h1>
    <p class="capa-sub">${r(e)}</p>
  </div>
  <div class="capa-rodape"><span>Holding Total</span><span class="capa-tag">${r(b)}</span></div>
</section>`}function L(a){return`
:root{ --laranja:#E8791E; --laranja-esc:#C25E10; --tinta:#1b1b1f; --tinta-suave:#3a3a42;
  --linha:#c9ccd2; --papel:#fff; --creme:#faf7f2 }
*{box-sizing:border-box}
@page{ size:A4; margin:22mm 18mm 18mm;
  @bottom-center{ content:counter(page); font:9pt "Helvetica Neue",Arial,sans-serif; color:#8a8f98 } }
@page capa{ margin:0; @bottom-center{ content:none } }
@page frente{ @bottom-center{ content:none } }
${a.map(t=>{const i=h(f(t).toUpperCase()),n=h(A(t));return`@page pg-${t.id}{
  @top-left{ content:"${i}"; font:8pt "Helvetica Neue",Arial,sans-serif; letter-spacing:.14em; color:#8a8f98 }
  @top-right{ content:"${n}"; font:italic 9pt Georgia,serif; color:#8a8f98 }
}
.pg-${t.id}{ page:pg-${t.id} }`}).join(`
`)}
html,body{margin:0;padding:0}
body{ font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Times New Roman",serif;
  color:var(--tinta); font-size:11.2pt; line-height:${g}; background:var(--papel);
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
.gap-inline.lg-xs{min-width:${p.xs}mm} .gap-inline.lg-sm{min-width:${p.sm}mm}
.gap-inline.lg-md{min-width:${p.md}mm} .gap-inline.lg-lg{min-width:${p.lg}mm}
.gap-inline.lg-xl{min-width:${p.xl}mm}
.gap-block{display:block;margin:2.5mm 0;text-indent:0}
.gap-block .linhas{display:block}
.gap-block .ln{display:block;height:8.4mm;border-bottom:1px solid var(--linha)}
.ln{position:relative}
.ln-suf{position:absolute;right:0;bottom:0;color:var(--tinta);font-style:normal}
/* ---------- respostas (variante preenchido) ---------- */
.resp{color:var(--laranja-esc);font-style:italic}
.resp-inline{border-bottom:1px solid var(--linha);padding:0 2px;display:inline}
.resp-inline.lg-xs{display:inline-block;min-width:${c.xs}ch}
.resp-inline.lg-sm{display:inline-block;min-width:${c.sm}ch}
.resp-inline.lg-md{display:inline-block;min-width:${c.md}ch}
.resp-inline.lg-lg{display:inline-block;min-width:${c.lg}ch}
.resp-inline.lg-xl{display:inline-block;min-width:${c.xl}ch}
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
`}function R({WORKBOOK:a,respostas:e={},aluno:t="",logo:i="/logo-cnhf.png",variante:n="preenchido",paginas:l=null,partes:o=null}){const s={capa:!0,sumario:!0,secoes:null,...o||{}},m=s.secoes?a.filter(u=>s.secoes.includes(u.id)):a,d=n==="preenchido"?"Meu workbook"+(t?" — "+t:""):"Caderno de acompanhamento",y=[s.capa?C(i,d):"",s.sumario?S(a,l):"",m.map(u=>z(u,n,e)).join(`
`)].join(`
`),k="Workbook CNHF — "+(n==="preenchido"?t||"preenchido":"Holding Familiar");return`<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>${r(k)}</title>
<style>${L(a)}</style>
</head><body>
${y}
</body></html>`}function P(a={},e="",t="/logo-cnhf.png"){const i=R({WORKBOOK:w,respostas:a,aluno:e,logo:t,variante:"preenchido"}),n=window.open("","_blank");if(!n)return{ok:!1,code:"POPUP_BLOQUEADO"};n.document.open(),n.document.write(i),n.document.close();const l=()=>{try{n.focus(),n.print()}catch{}},o=n.document.querySelector(".capa-logo");return o&&!o.complete?(o.onload=l,o.onerror=l,setTimeout(l,1500)):setTimeout(l,300),{ok:!0}}export{P as imprimeWorkbook};
