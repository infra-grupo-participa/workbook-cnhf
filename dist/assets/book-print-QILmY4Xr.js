import{W as m,A as f}from"./Workbook-DoMo6nRo.js";import"./index-BUekSXks.js";import"./vue-DtqGZN-h.js";import"./supabase-kPbh7bwL.js";import"./arrow-left-BeyNpH5z.js";import"./download-Q-x_xmzs.js";const d=["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];function t(o){return String(o??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function u(o,a){if(o.tipo==="prosa")return`<span class="prosa">${t(o.texto)} </span>`;if(o.tipo==="subtitulo")return`<h3 class="subtitulo">${t(o.texto)}</h3>`;const e=a[o.id]||"",i=o.sufixo?`<span class="suf">${t(o.sufixo)}</span>`:"";return o.tipo==="citacao-legal"?`<div class="legal"><span class="legal-rotulo">${t(o.rotulo)}</span><div class="resp resp-bloco">${t(e)||"&nbsp;"}</div>${i}</div>`:o.tamanho==="linha"?`<span class="resp resp-inline">${t(e)||"&nbsp;"}</span>${i}`:`<span class="resp resp-bloco">${t(e)||"&nbsp;"}</span>${i}`}function g(o,a){const e=o.tipo==="capitulo"?`Capítulo ${d[o.numero-1]||o.numero}`:`Seção Extra ${o.numero}`,i=o.blocos.map(c=>u(c,a)).join(""),l=o.ancora?`<p class="ancora">${t(f)}</p>`:"";return`<section class="cap">
    <header class="cap-head"><div class="cap-kicker">${t(e)}</div>
    <h2 class="cap-titulo">${t(o.titulo)}</h2></header>
    <div class="cap-corpo">${i}</div>${l}</section>`}function b(){return`<section class="sumario"><h2 class="sum-h">Sumário</h2><ol class="sum-lista">${m.map(a=>{const e=a.tipo==="capitulo"?`Capítulo ${d[a.numero-1]||a.numero}`:`Seção Extra ${a.numero}`;return`<li><span class="sum-num">${t(e)}</span><span class="sum-tit">${t(a.titulo)}</span></li>`}).join("")}</ol></section>`}const h=`
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
`;function v(o={},a="",e="logo-cnhf.png"){const i=m.map(p=>g(p,o)).join(""),l="Meu workbook"+(a?" — "+t(a):""),c=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Workbook CNHF — ${t(a)||"preenchido"}</title><style>${h}</style></head>
<body>
  <section class="capa">
    <img class="capa-logo" src="${t(e)}" alt="CNHF">
    <div>
      <div class="capa-selo">Curso Nacional de Formação em Holding Familiar</div>
      <h1 class="capa-titulo">Workbook</h1><p class="capa-sub">${l}</p>
    </div>
    <div class="capa-rod"><span>Holding Total</span>
      <span class="capa-tag">${t(f)}</span></div>
  </section>
  ${b()}
  ${i}
</body></html>`,s=window.open("","_blank");if(!s)return{ok:!1,code:"POPUP_BLOQUEADO"};s.document.open(),s.document.write(c),s.document.close();const n=()=>{try{s.focus(),s.print()}catch{}},r=s.document.querySelector(".capa-logo");return r&&!r.complete?(r.onload=n,r.onerror=n,setTimeout(n,1500)):setTimeout(n,300),{ok:!0}}export{v as imprimeWorkbook};
