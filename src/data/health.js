/* ============================================================
   ÍNDICE DE SAÚDE DA RESPOSTA (health score) + FLAGS DE NEGÓCIO
   ------------------------------------------------------------
   A pesquisa serve p/ 3 coisas (briefing João Pedro / Victor Hugo):
     1. dizer O QUE ANUNCIAR   → dores mais citadas (texto)
     2. medir a QUALIDADE do lead → health_score (detecta lixo)
     3. PRIORIZAR contato       → flags (>30k, concorrente, "não sei…")

   `avaliarSaude` roda no submit (client) e o resultado é gravado junto
   da resposta. A ANÁLISE em si mora no dashboard externo (o workbook
   só grava) — aqui só produzimos score + flags.
   ============================================================ */

const limpo = (s) => String(s || '').trim().toLowerCase()

// nomes de teclado/lixo comuns e placeholders
const NOMES_LIXO = [
  'teste', 'test', 'asdf', 'qwer', 'aaa', 'abc', 'xxx', 'fulano', 'ciclano',
  'beltrano', 'nome', 'sem nome', 'nao sei', 'não sei', 'na', 'nn', 'aa', 'zz',
]

/** nome parece real? (tem nome + sobrenome, letras, sem padrão de lixo) */
export function nomePlausivel(nome) {
  const n = limpo(nome).replace(/\s+/g, ' ').trim()
  if (!n || n.length < 3) return false
  if (!/\s/.test(n)) return false                       // só uma palavra
  if (!/^[a-zà-ÿ'’.\s-]+$/.test(n)) return false          // caracteres estranhos
  if (NOMES_LIXO.some((l) => n === l || n.startsWith(l + ' '))) return false
  const partes = n.split(' ').filter(Boolean)
  if (partes.some((p) => /(.)\1{2,}/.test(p))) return false // "aaaa", "jjjj"
  // muitas consoantes seguidas em qualquer parte → provável tecla batida
  if (partes.some((p) => /[bcdfghjklmnpqrstvwxyz]{5,}/i.test(p))) return false
  return true
}

/** texto livre parece resposta real (não vazio/lixo/monossílabo)? */
export function textoPlausivel(txt) {
  const t = limpo(txt).trim()
  if (t.length < 8) return false
  if (/^(.)\1+$/.test(t.replace(/\s/g, ''))) return false // "aaaaaa"
  const palavras = t.split(/\s+/).filter((w) => w.length > 1)
  if (palavras.length < 2) return false
  if (NOMES_LIXO.includes(t)) return false
  return true
}

/**
 * avaliarSaude — recebe o contato + answers e devolve { score, flags }.
 *   score: 0-100 (qualidade do preenchimento; quanto maior, mais confiável)
 *   flags: string[] p/ priorização/segmentação no dashboard
 * Flags de negócio possíveis:
 *   'prioridade_faturamento'  → faturamento acima de R$ 30k
 *   'concorrente'             → já usa método (identificar Pablo Arruda, Igor…)
 *   'nao_sabe_comecar'        → dor "não sei por onde começar"
 *   'area_outra'              → área fora de Advocacia/Contabilidade
 *   'suspeito_nome'/'suspeito_email'/'suspeito_texto' → possível lixo
 *
 * Obs.: a pesquisa NÃO coleta telefone (só nome + e-mail; o e-mail é a chave
 * de cruzamento). Peso: nome 35 + e-mail 30 + texto 20 + qualificação 15.
 */
export function avaliarSaude({ nome, email, answers = {} }) {
  const flags = []
  let score = 0

  // --- qualidade do preenchimento (0-100) ---
  const okNome = nomePlausivel(nome)
  const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo(email))
  const okTexto = textoPlausivel(answers.dificuldade)

  if (okNome) score += 35; else flags.push('suspeito_nome')
  if (okEmail) score += 30; else flags.push('suspeito_email')
  if (okTexto) score += 20; else flags.push('suspeito_texto')
  // completou todas as perguntas de qualificação
  const qualif = ['area', 'atua_holding', 'faturamento', 'objetivo']
  if (qualif.every((k) => answers[k])) score += 15

  // --- flags de negócio (priorização) ---
  if (answers.faturamento === 'Acima de R$ 30 mil') flags.push('prioridade_faturamento')
  if (answers.atua_holding === 'Já atuo e sigo um método bem definido') flags.push('concorrente')
  if (answers.area === 'Outra') flags.push('area_outra')

  const dor = limpo(answers.dificuldade) + ' ' + limpo(answers.objetivo)
  if (/n[aã]o sei por onde come|nao sei come|por onde come[cç]|do zero|começar do/.test(dor)) {
    flags.push('nao_sabe_comecar')
  }

  return { score: Math.max(0, Math.min(100, score)), flags }
}
