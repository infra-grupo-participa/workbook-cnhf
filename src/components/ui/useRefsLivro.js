/* Referências de capítulo compartilhadas entre a central e as anotações.
   A anotação grava o id da seção do livro no campo `aula` (coluna texto já
   existente) — valores legados 'aula1..3' continuam legíveis com rótulo próprio. */
import { WORKBOOK } from '../../data/workbook-content.js'

export const OPCOES_REF = [
  { id: '', label: 'Geral — sem capítulo' },
  ...WORKBOOK.map((s) => ({
    id: s.id,
    label: s.tipo === 'capitulo'
      ? `Capítulo ${s.romano} — ${s.titulo}`
      : `Extra ${s.numero} — ${s.titulo}`,
  })),
]

const LEGADO = { aula1: 'Aula 1', aula2: 'Aula 2', aula3: 'Aula 3' }

/** rótulo curto da referência ("Capítulo IV", "Extra 2", "Aula 1", "Geral") */
export function rotuloRef(id) {
  if (!id) return 'Geral'
  const s = WORKBOOK.find((x) => x.id === id)
  if (s) return s.tipo === 'capitulo' ? `Capítulo ${s.romano}` : `Extra ${s.numero}`
  return LEGADO[id] || id
}

/** título completo da seção, ou '' se não for seção do livro */
export function tituloRef(id) {
  const s = WORKBOOK.find((x) => x.id === id)
  return s ? s.titulo : ''
}

/** o id referencia uma seção real do livro? (permite "Abrir no livro") */
export function ehSecaoDoLivro(id) {
  return WORKBOOK.some((s) => s.id === id)
}
