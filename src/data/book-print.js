// book-print.js — casca fina do caminho BROWSER: gera o "Meu workbook preenchido"
// e abre a janela de impressão (window.print → Salvar como PDF).
// TODO o HTML/CSS do livro vem de book-render.js (fonte única, compartilhada com
// o build Node da apostila em scripts/build-book.mjs).
import { WORKBOOK } from './workbook-content.js'
import { renderizarLivro } from './book-render.js'

/**
 * imprimeWorkbook — abre uma janela com o workbook preenchido e chama print().
 * Assinatura pública estável (Workbook.vue chama exatamente assim).
 * @param {object} respostas  { "cap-1-l1": "texto" } ou { "cap-1-l1": {v,t} }
 * @param {string} [aluno]    nome exibido na capa
 * @param {string} [logoUrl]  URL do logo (default: /logo-cnhf.png servido pelo app)
 */
export function imprimeWorkbook(respostas = {}, aluno = '', logoUrl = '/logo-cnhf.png') {
  // Sem nº de página no sumário aqui: numerar exige medir a paginação em duas
  // passadas (só o build Node faz isso). O sumário do aluno sai sem números,
  // resolvido tipograficamente — o PDF digital é pesquisável/navegável.
  const html = renderizarLivro({
    WORKBOOK, respostas, aluno, logo: logoUrl, variante: 'preenchido',
  })

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
