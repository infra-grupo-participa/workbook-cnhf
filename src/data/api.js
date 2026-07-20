/* ============================================================
   CAMADA DE DADOS + AUTENTICAÇÃO — Fase 1: MOCK (localStorage)
   ------------------------------------------------------------
   FASE 2 (Supabase): trocar o corpo destas funções por chamadas
   supabase-js, mantendo as MESMAS assinaturas. Mapeamento:

     login()            → supabase.auth.signInWithPassword()
     requestReset()     → supabase.auth.resetPasswordForEmail()  (e-mail nativo)
     resetPassword()    → supabase.auth.updateUser({ password })
     changePassword()   → supabase.auth.updateUser({ password })
     isRegisteredLead() → select em `leads` (sincronizada com o CRM)
     submitSurvey()     → insert em `respostas_pesquisa`
     getAllResults()    → select em `respostas_pesquisa` (RLS: só admin)

   A "base de leads" abaixo simula o CRM. Na Fase 2 ela vem da tabela
   `leads`, alimentada pela página de captura / ActiveCampaign / Clickmax.
   ============================================================ */

const DEFAULT_PASSWORD = '12345678'

// --- base de leads simulada (quem se cadastrou no lançamento) ---
const SEED_LEADS = [
  { email: 'arthur@advmais.com', nome: 'Arthur Galvão', profissao: 'Advogado(a)' },
  { email: 'joao@advmais.com', nome: 'João Pedro', profissao: 'Advogado(a)' },
  { email: 'teste.advogado@gmail.com', nome: 'Advogado Teste', profissao: 'Advogado(a)' },
  { email: 'teste.contador@gmail.com', nome: 'Contador Teste', profissao: 'Contador(a)' },
]

// --- helpers de storage ---
const norm = (e) => (e || '').trim().toLowerCase()
const read = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb } catch { return fb } }
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v))

const K_LEADS = 'wb-leads'
const K_USERS = 'wb-users'     // { email: { password, nome } }
const K_RESP = 'wb-respostas'  // [ { email, nome, ts, answers } ]
const K_RESET = 'wb-reset'     // { token: email }
const K_SESSION = 'wb-session' // email

function leadsBase() {
  const extra = read(K_LEADS, [])
  const map = {}
  for (const l of [...SEED_LEADS, ...extra]) map[norm(l.email)] = l
  return map
}

// ============================================================
// LEADS
// ============================================================
export async function isRegisteredLead(email) {
  return !!leadsBase()[norm(email)]
}
export async function getLead(email) {
  return leadsBase()[norm(email)] ?? null
}

// ============================================================
// AUTENTICAÇÃO
// ============================================================
function users() { return read(K_USERS, {}) }
function saveUsers(u) { write(K_USERS, u) }

/** Garante um registro de usuário com a senha padrão na 1ª vez. */
function ensureUser(email) {
  const e = norm(email)
  const all = users()
  if (!all[e]) {
    const lead = leadsBase()[e]
    all[e] = { password: DEFAULT_PASSWORD, nome: lead?.nome ?? '' }
    saveUsers(all)
  }
  return all[e]
}

/**
 * login → { ok, code, surveyDone }
 * códigos de erro: NOT_REGISTERED (e-mail não está no cadastro) | BAD_PASSWORD
 */
export async function login(email, password) {
  const e = norm(email)
  if (!(await isRegisteredLead(e))) return { ok: false, code: 'NOT_REGISTERED' }
  const u = ensureUser(e)
  if (password !== u.password) return { ok: false, code: 'BAD_PASSWORD' }
  write(K_SESSION, e)
  return { ok: true, surveyDone: await hasSurvey(e) }
}

export function currentUser() { return read(K_SESSION, null) }
export function logout() { localStorage.removeItem(K_SESSION) }

export async function changePassword(email, atual, nova) {
  const e = norm(email)
  const all = users()
  if (!all[e]) return { ok: false, code: 'NOT_FOUND' }
  if (all[e].password !== atual) return { ok: false, code: 'BAD_PASSWORD' }
  all[e].password = nova
  saveUsers(all)
  return { ok: true }
}

/**
 * requestReset → simula o e-mail de redefinição.
 * Fase 2: supabase.auth.resetPasswordForEmail(email) envia de verdade.
 * No mock, devolvemos o token/link para exibir na tela.
 */
export async function requestReset(email) {
  const e = norm(email)
  if (!(await isRegisteredLead(e))) return { ok: false, code: 'NOT_REGISTERED' }
  const token = 'rt_' + Math.abs(hashStr(e + K_RESET + navigator.userAgent)).toString(36)
  const map = read(K_RESET, {})
  map[token] = e
  write(K_RESET, map)
  return { ok: true, token, link: `${location.origin}${location.pathname}#/redefinir-senha?token=${token}` }
}

export async function resetPassword(token, nova) {
  const map = read(K_RESET, {})
  const e = map[token]
  if (!e) return { ok: false, code: 'BAD_TOKEN' }
  const all = users()
  ensureUser(e)
  all[e].password = nova
  saveUsers(all)
  delete map[token]
  write(K_RESET, map)
  return { ok: true, email: e }
}

// ============================================================
// PESQUISA
// ============================================================
export async function hasSurvey(email) {
  const e = norm(email)
  return read(K_RESP, []).some((r) => r.email === e)
}

export async function submitSurvey(email, answers) {
  const e = norm(email)
  const lead = leadsBase()[e]
  const list = read(K_RESP, [])
  // não duplica: se já respondeu, atualiza
  const idx = list.findIndex((r) => r.email === e)
  const registro = { email: e, nome: lead?.nome ?? '', ts: nowTs(), answers }
  if (idx >= 0) list[idx] = registro
  else list.push(registro)
  write(K_RESP, list)
  return { ok: true }
}

export async function getAllResults() {
  return read(K_RESP, []).slice().sort((a, b) => b.ts - a.ts)
}

// ============================================================
// PRESENÇA + EXERCÍCIOS por aula (Fase 2: tabela `progresso`)
// presenca: 'vivo' | 'replay' | 'nao' | null ; exercicio: boolean
// ============================================================
const K_PROG = 'wb-progresso' // { email: { aula1: { presenca, exercicio }, ... } }

export async function getProgresso(email) {
  const all = read(K_PROG, {})
  return all[norm(email)] ?? {}
}
export async function setPresenca(email, aula, status) {
  const e = norm(email)
  const all = read(K_PROG, {})
  all[e] = all[e] || {}
  all[e][aula] = { ...(all[e][aula] || {}), presenca: status }
  write(K_PROG, all)
  return all[e][aula]
}
export async function marcarExercicio(email, aula) {
  const e = norm(email)
  const all = read(K_PROG, {})
  all[e] = all[e] || {}
  all[e][aula] = { ...(all[e][aula] || {}), exercicio: true }
  write(K_PROG, all)
  return all[e][aula]
}

// ============================================================
// utils (sem Date.now/Math.random para robustez do mock)
// ============================================================
let _seq = 0
function nowTs() {
  // timestamp monotônico simples; Fase 2: created_at do Supabase
  const base = read('wb-tsbase', 0) || 1_753_000_000_000
  _seq += 1
  const t = base + _seq
  write('wb-tsbase', t)
  return t
}
function hashStr(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0 }
  return h
}

export const AUTH_INFO = {
  senhaPadrao: DEFAULT_PASSWORD,
  leadsDemo: SEED_LEADS.map((l) => l.email),
}
