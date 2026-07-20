/* ============================================================
   CAMADA DE DADOS + AUTENTICAÇÃO — Fase 2: SUPABASE
   ------------------------------------------------------------
   Projeto principal do Grupo Participa (mbvybujpkwuorhtdzcde),
   schema `workbook`. Auth nativo Supabase.

   As assinaturas são mantidas iguais às da Fase 1 (mock) para não
   quebrar as views. `currentUser()` continua SÍNCRONO: lê de um
   cache de sessão populado no boot (initAuth) e mantido pelo
   onAuthStateChange.
   ============================================================ */

import { supabase } from './supabase.js'

const norm = (e) => (e || '').trim().toLowerCase()

// --- cache de sessão (para currentUser() síncrono) ---
let _session = null
let _perfil = null // { nome, role }

function setSession(session) {
  _session = session
  if (!session) _perfil = null
}

/**
 * Inicializa a sessão antes de montar o app. Chame em main.js e
 * só monte depois de resolver, para o 1º render já ter o usuário.
 */
export async function initAuth() {
  const { data } = await supabase.auth.getSession()
  setSession(data.session)
  supabase.auth.onAuthStateChange((_evt, session) => setSession(session))
  if (_session) await loadPerfil()
}

async function loadPerfil() {
  if (!_session) { _perfil = null; return null }
  const { data } = await supabase
    .from('perfis')
    .select('nome, role')
    .eq('user_id', _session.user.id)
    .maybeSingle()
  _perfil = data || { nome: '', role: 'aluno' }
  return _perfil
}

// ============================================================
// SESSÃO
// ============================================================
/** e-mail do usuário logado (síncrono) ou null */
export function currentUser() {
  return _session?.user?.email ?? null
}
export function currentUserId() {
  return _session?.user?.id ?? null
}
export async function logout() {
  await supabase.auth.signOut()
  setSession(null)
}

// ============================================================
// LEADS
// ============================================================
export async function isRegisteredLead(email) {
  const { data, error } = await supabase.rpc('email_eh_lead', { p_email: norm(email) })
  if (error) return false
  return !!data
}

/** dados do lead/perfil do usuário logado (para saudação no ambiente) */
export async function getLead(_email) {
  if (_perfil) return _perfil
  return await loadPerfil()
}

// ============================================================
// AUTENTICAÇÃO
// ============================================================
/**
 * login → { ok, code, surveyDone }
 * códigos de erro: NOT_REGISTERED | BAD_PASSWORD
 */
export async function login(email, password) {
  const e = norm(email)
  const { data, error } = await supabase.auth.signInWithPassword({ email: e, password })
  if (error) {
    // distingue "e-mail não cadastrado no lançamento" de "senha errada"
    const ehLead = await isRegisteredLead(e)
    return { ok: false, code: ehLead ? 'BAD_PASSWORD' : 'NOT_REGISTERED' }
  }
  setSession(data.session)
  await loadPerfil()
  return { ok: true, surveyDone: await hasSurvey() }
}

/**
 * Auto-cadastro por convite (link público /criar-acesso).
 * Cria o usuário no Auth com metadata sistema='workbook' (o trigger
 * cria perfil + lead). Retorna { ok, code, needsConfirm }.
 * códigos: EXISTS (e-mail já tem acesso) | ERROR
 */
export async function signUpConvite({ email, nome, senha, profissao }) {
  const e = norm(email)
  const { data, error } = await supabase.auth.signUp({
    email: e,
    password: senha,
    options: {
      data: { sistema: 'workbook', nome: nome || '', profissao: profissao || null },
      emailRedirectTo: `${location.origin}${location.pathname}`,
    },
  })
  if (error) {
    const code = /already|exist|registered/i.test(error.message) ? 'EXISTS' : 'ERROR'
    return { ok: false, code, message: error.message }
  }
  // Se o projeto exigir confirmação de e-mail, não há sessão ainda.
  const needsConfirm = !data.session
  if (data.session) { setSession(data.session); await loadPerfil() }
  return { ok: true, needsConfirm }
}

/**
 * changePassword — auth nativo não checa a senha atual, então
 * revalidamos com um signIn silencioso para manter a UX de erro.
 */
export async function changePassword(email, atual, nova) {
  const e = norm(email) || currentUser()
  const check = await supabase.auth.signInWithPassword({ email: e, password: atual })
  if (check.error) return { ok: false, code: 'BAD_PASSWORD' }
  const { error } = await supabase.auth.updateUser({ password: nova })
  if (error) return { ok: false, code: 'ERROR', message: error.message }
  return { ok: true }
}

/**
 * requestReset — envia o e-mail nativo de redefinição do Supabase.
 * (não expõe mais link mock). Retorna { ok, code }.
 */
export async function requestReset(email) {
  const e = norm(email)
  if (!(await isRegisteredLead(e))) return { ok: false, code: 'NOT_REGISTERED' }
  const { error } = await supabase.auth.resetPasswordForEmail(e, {
    redirectTo: `${location.origin}${location.pathname}#/redefinir-senha`,
  })
  if (error) return { ok: false, code: 'ERROR', message: error.message }
  return { ok: true }
}

/**
 * resetPassword — no fluxo Supabase o usuário chega em /redefinir-senha
 * já com uma sessão de recovery (detectSessionInUrl). O token do link
 * é ignorado; apenas trocamos a senha do usuário atual.
 */
export async function resetPassword(_token, nova) {
  const { error } = await supabase.auth.updateUser({ password: nova })
  if (error) return { ok: false, code: 'BAD_TOKEN', message: error.message }
  return { ok: true, email: currentUser() }
}

// ============================================================
// PESQUISA
// ============================================================
export async function hasSurvey(_email) {
  const uid = currentUserId()
  if (!uid) return false
  const { count } = await supabase
    .from('respostas_pesquisa')
    .select('user_id', { count: 'exact', head: true })
    .eq('user_id', uid)
  return (count ?? 0) > 0
}

export async function submitSurvey(_email, answers) {
  const uid = currentUserId()
  if (!uid) return { ok: false, code: 'NO_SESSION' }
  const registro = {
    user_id: uid,
    email: currentUser(),
    nome: _perfil?.nome ?? '',
    answers,
    atualizado_em: new Date().toISOString(),
  }
  const { error } = await supabase
    .from('respostas_pesquisa')
    .upsert(registro, { onConflict: 'user_id' })
  if (error) return { ok: false, code: 'ERROR', message: error.message }
  return { ok: true }
}

/** getAllResults — admin only (RLS libera admin a ler todas). */
export async function getAllResults() {
  const { data, error } = await supabase
    .from('respostas_pesquisa')
    .select('email, nome, answers, criado_em, atualizado_em')
    .order('atualizado_em', { ascending: false })
  if (error) return []
  // normaliza p/ o mesmo formato que Resultados.vue espera (ts + answers)
  return (data || []).map((r) => ({
    email: r.email,
    nome: r.nome,
    answers: r.answers || {},
    ts: r.atualizado_em || r.criado_em,
  }))
}

// ============================================================
// PRESENÇA + EXERCÍCIOS por aula
// ============================================================
export async function getProgresso(_email) {
  const uid = currentUserId()
  if (!uid) return {}
  const { data, error } = await supabase
    .from('progresso')
    .select('aula, presenca, exercicio')
    .eq('user_id', uid)
  if (error) return {}
  const map = {}
  for (const r of data || []) map[r.aula] = { presenca: r.presenca, exercicio: r.exercicio }
  return map
}
export async function setPresenca(_email, aula, status) {
  const uid = currentUserId()
  if (!uid) return null
  await supabase
    .from('progresso')
    .upsert({ user_id: uid, aula, presenca: status, atualizado_em: new Date().toISOString() },
      { onConflict: 'user_id,aula' })
  return { presenca: status }
}
export async function marcarExercicio(_email, aula) {
  const uid = currentUserId()
  if (!uid) return null
  await supabase
    .from('progresso')
    .upsert({ user_id: uid, aula, exercicio: true, atualizado_em: new Date().toISOString() },
      { onConflict: 'user_id,aula' })
  return { exercicio: true }
}

// ============================================================
// ANOTAÇÕES — trilha / mapa mental do aluno ao longo do ciclo
// ============================================================
export async function listAnotacoes() {
  const uid = currentUserId()
  if (!uid) return []
  const { data, error } = await supabase
    .from('anotacoes')
    .select('id, titulo, conteudo, aula, criado_em, atualizado_em')
    .eq('user_id', uid)
    .order('atualizado_em', { ascending: false })
  if (error) return []
  return data || []
}
export async function criarAnotacao({ titulo, conteudo, aula }) {
  const uid = currentUserId()
  if (!uid) return { ok: false }
  const { data, error } = await supabase
    .from('anotacoes')
    .insert({ user_id: uid, titulo: titulo || '', conteudo: conteudo || '', aula: aula || null })
    .select('id, titulo, conteudo, aula, criado_em, atualizado_em')
    .single()
  if (error) return { ok: false, message: error.message }
  return { ok: true, anotacao: data }
}
export async function atualizarAnotacao(id, { titulo, conteudo, aula }) {
  const { data, error } = await supabase
    .from('anotacoes')
    .update({ titulo, conteudo, aula: aula || null, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select('id, titulo, conteudo, aula, criado_em, atualizado_em')
    .single()
  if (error) return { ok: false, message: error.message }
  return { ok: true, anotacao: data }
}
export async function removerAnotacao(id) {
  const { error } = await supabase.from('anotacoes').delete().eq('id', id)
  return { ok: !error }
}

// ============================================================
// ADMIN
// ============================================================
export async function isAdmin() {
  if (!_perfil) await loadPerfil()
  return _perfil?.role === 'admin'
}
