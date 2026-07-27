// test-book-render.mjs — regressão de escape do livro (XSS via nome do aluno /
// respostas / conteúdo). Roda com: node scripts/test-book-render.mjs  (exit 1 se falhar)
//
// Contexto: book-print.js abre um about:blank same-origin via document.write —
// uma regressão de escape no book-render vira execução com acesso ao
// localStorage (refresh token Supabase) e ao IndexedDB. Este teste trava isso.

import { renderizarLivro, escapeHtml } from '../src/data/book-render.js'
import { WORKBOOK } from '../src/data/workbook-content.js'

let falhas = 0
function ok(cond, msg) {
  if (cond) { console.log('  ok -', msg) }
  else { falhas++; console.error('  FALHA -', msg) }
}

const PAYLOAD = '<img src=x onerror=alert(1)>'
const PAYLOAD_ASPAS = `'"><script>alert(document.domain)</script>`

// todas as lacunas recebem payload (cobre inline, bloco e citação legal)
const respostas = {}
for (const s of WORKBOOK) for (const p of s.paragrafos) {
  if (p.tipo === 'citacao-legal') respostas[p.id] = PAYLOAD
  else if (p.tipo === 'paragrafo') for (const b of p.blocos) {
    if (b.tipo === 'lacuna') respostas[b.id] = PAYLOAD + PAYLOAD_ASPAS
  }
}

for (const variante of ['preenchido', 'branco']) {
  console.log(`variante ${variante}:`)
  const html = renderizarLivro({
    WORKBOOK,
    respostas,
    aluno: PAYLOAD + PAYLOAD_ASPAS,
    logo: '/logo-cnhf.png',
    variante,
  })
  // "onerror=" pode existir como TEXTO escapado (&lt;img … onerror=…&gt;);
  // o que não pode é aparecer dentro de uma tag real (fora de entidade).
  ok(!/<[^>]*\bonerror\s*=/i.test(html), 'sem "onerror=" dentro de tag real')
  ok(!/<script/i.test(html), 'sem "<script" cru na saída')
  ok(!/<img\s+src=x/i.test(html), 'payload de <img> não vira tag')
  if (variante === 'preenchido') {
    // preenchido imprime respostas e aluno — a forma escapada tem que existir
    ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'), 'resposta sai escapada como texto')
    ok(html.includes('&#39;&quot;&gt;'), "aspas simples e duplas escapadas (&#39;/&quot;)")
  } else {
    // branco não imprime resposta nem aluno — nenhum payload pode vazar
    ok(!html.includes('alert(document.domain)'), 'branco não imprime nenhum payload')
  }
}

// logo malicioso não pode quebrar o atributo src (aspa tem que virar &quot;)
console.log('logo:')
const htmlLogo = renderizarLivro({
  WORKBOOK, respostas: {}, variante: 'branco',
  logo: '/logo-cnhf.png" onerror="alert(1)',
})
ok(!htmlLogo.includes('src="/logo-cnhf.png" onerror='), 'aspa do valor não encerra o src')
ok(htmlLogo.includes('src="/logo-cnhf.png&quot; onerror=&quot;alert(1)"'),
  'valor inteiro fica preso dentro do atributo (aspas escapadas)')

// escCss (cabeçalho corrente): título com aspas/quebra de linha não pode
// encerrar a string do content:"…" no @page e injetar regras
const W2 = [{ ...WORKBOOK[0], titulo: 'X"} @page{margin:0} \n .hack{}' }]
const html2 = renderizarLivro({ WORKBOOK: W2, variante: 'branco', respostas: {} })
const css = html2.slice(html2.indexOf('<style>'), html2.indexOf('</style>'))
console.log('escCss:')
ok(!/content:"[^"]*[\r\n]/.test(css), 'content:"…" sem quebra de linha crua')
ok(/content:"X\\"\} @page\{margin:0\}\s*\.hack\{\}"/.test(css),
  'aspas viram \\" e newline vira espaço (payload preso dentro da string)')
ok(!css.includes('content:"X"'), 'a aspa do payload não encerra a string CSS')

// escapeHtml unitário
console.log('escapeHtml:')
ok(escapeHtml(`<>&"'`) === '&lt;&gt;&amp;&quot;&#39;', "escapa < > & \" '")

if (falhas) { console.error(`\n${falhas} falha(s).`); process.exit(1) }
console.log('\nTodos os testes de escape passaram.')
