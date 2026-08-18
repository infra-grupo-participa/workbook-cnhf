/* ============================================================
   VALIDAÇÃO DE CONTATO — nome, e-mail, WhatsApp
   ------------------------------------------------------------
   Extraído de Pesquisa.vue (2026-08-18) para ser reaproveitado por
   Registrar.vue sem duplicar ~50 linhas. Funções PURAS: recebem o
   valor por parâmetro em vez de ler `contato.value` — quem chama é
   dono do estado.

   IMPORTANTE: comportamento idêntico ao que a Pesquisa já tinha.
   checarWhats() sem opções continua OPCIONAL (vazio = permitido) —
   é o contrato da Pesquisa. Quem precisa exigir preenchimento (ex.:
   Registrar.vue) passa { obrigatorio: true }.
   ============================================================ */

export const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim())

// --- formatadores (evitam dado quebrado entrando na planilha) ---
export function normalizarNome(v) {
  const minus = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])
  return String(v || '').trim().replace(/\s+/g, ' ').toLowerCase()
    .split(' ')
    .map((w) => (minus.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}

// máscara de telefone em tempo real: (XX) XXXXX-XXXX. Digitação vira máscara;
// colagem em qualquer formato é aceita (+55, pontos, espaços) — o +55 é
// descartado só para exibição; o servidor normaliza de verdade.
export function mascararTelefone(v) {
  let d = String(v || '').replace(/\D/g, '')
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2)   // colou com +55
  d = d.slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return d.replace(/^(\d{2})(\d*)/, '($1) $2')
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d*)/, '($1) $2-$3')
  return d.replace(/^(\d{2})(\d{5})(\d*)/, '($1) $2-$3')
}

export function checarNome(v) {
  const n = normalizarNome(v)
  if (!n) return 'Informe o seu nome completo.'
  if (n.length < 3 || !/\s/.test(n)) return 'Informe nome e sobrenome.'
  if (!/^[A-Za-zÀ-ÿ'’\s-]+$/.test(n)) return 'Use apenas letras no nome.'
  return ''
}
export function checarEmail(v) {
  const e = String(v || '').trim().toLowerCase()
  if (!e) return 'Informe o seu e-mail.'
  if (!emailValido(e)) return 'Informe um e-mail válido (ex.: nome@email.com).'
  return ''
}
/**
 * checarWhats — na Pesquisa, o WhatsApp é OPCIONAL (vazio passa). Em telas
 * onde o campo é obrigatório (ex.: Registrar.vue), passe { obrigatorio: true }.
 */
export function checarWhats(v, { obrigatorio = false } = {}) {
  const d = String(v || '').replace(/\D/g, '')
  if (!d) return obrigatorio ? 'Informe o seu WhatsApp.' : ''
  if (d.length < 10 || d.length > 11) return 'Informe o DDD + número completo.'
  return ''
}
