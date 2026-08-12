/*
  Datas das aulas ao vivo do CNHF. TROCAR AQUI E SÓ AQUI.

  Confirmado pelo Marcio em 12/08/2026: 24, 25 e 26 de agosto, 19h30 (Brasília),
  janela de 120 min por aula.

  O offset -03:00 é EXPLÍCITO de propósito: `new Date('2026-08-24 19:30')` seria
  interpretado no fuso do aparelho do aluno, e quem estiver com o celular em
  outro fuso veria a contagem errada. Contador errado é pior que contador
  nenhum — a pessoa perde a aula confiando no número.
*/
export const AULAS = [
  { n: 1, inicio: '2026-08-24T19:30:00-03:00' },
  { n: 2, inicio: '2026-08-25T19:30:00-03:00' },
  { n: 3, inicio: '2026-08-26T19:30:00-03:00' },
]

/* quanto tempo a aula fica marcada como "ao vivo agora" */
export const DURACAO_AULA_MIN = 120

const MS_MIN = 60 * 1000

/*
  Estado do evento num instante. Devolve sempre um objeto com `fase`:
    'antes'   → ainda vai começar (tem `proxima` e `faltam`)
    'ao-vivo' → estamos dentro da janela de uma aula (tem `atual`)
    'fim'     → a última aula já terminou
*/
export function estadoEvento(agora = new Date()) {
  const t = agora.getTime()
  const aulas = AULAS.map((a) => {
    const inicio = new Date(a.inicio).getTime()
    return { ...a, inicio, fim: inicio + DURACAO_AULA_MIN * MS_MIN }
  })

  const aoVivo = aulas.find((a) => t >= a.inicio && t < a.fim)
  if (aoVivo) return { fase: 'ao-vivo', atual: aoVivo }

  const proxima = aulas.find((a) => t < a.inicio)
  if (proxima) return { fase: 'antes', proxima, faltam: proxima.inicio - t }

  return { fase: 'fim' }
}

/* "3d 04h 12m" / "04h 12m" / "12m 30s" — só as unidades que importam */
export function formatarRestante(ms) {
  if (ms <= 0) return '0m'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const seg = s % 60
  if (d > 0) return `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`
  if (h > 0) return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`
  return `${m}m ${String(seg).padStart(2, '0')}s`
}

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/* "segunda, 24 de agosto, às 19h30" — sempre no fuso de Brasília, não no do
   aparelho, para bater com o que a copy dos disparos promete. */
export function dataPorExtenso(inicioMs) {
  const d = new Date(inicioMs)
  const br = new Date(d.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const hh = String(br.getHours()).padStart(2, '0')
  const mm = String(br.getMinutes()).padStart(2, '0')
  return `${DIAS[br.getDay()]}, ${br.getDate()} de ${MESES[br.getMonth()]}, às ${hh}h${mm}`
}
