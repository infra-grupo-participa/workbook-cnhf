// book-template.mjs — casca fina do caminho NODE (apostila impressa).
// TODO o HTML/CSS do livro vem de src/data/book-render.js (fonte única,
// compartilhada com o caminho browser em src/data/book-print.js).

import { renderizarLivro } from '../src/data/book-render.js'

export function montarLivro({
  WORKBOOK, logoDataUri, variante = 'branco', respostas = null, aluno = null,
  paginas = null, partes = null,
}) {
  return renderizarLivro({
    WORKBOOK,
    respostas: respostas || {},
    aluno: aluno || '',
    logo: logoDataUri,
    variante,
    paginas,
    partes,
  })
}
