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

import { supabase, SUPABASE_URL, SUPABASE_ANON } from './supabase.js'
import { avaliarSaude } from './health.js'
import { normalizarRespostas, aplicarSaveNoRow } from './store.js'

const norm = (e) => (e || '').trim().toLowerCase()

// --- cache de sessão (para currentUser() síncrono) ---
let _session = null
let _perfil = null // { nome, role }
let _recovery = false // sessão veio de link de recuperação de senha?

function setSession(session) {
  _session = session
  if (!session) { _perfil = null; _recovery = false }
}

/**
 * Inicializa a sessão antes de montar o app. Chame em main.js e
 * só monte depois de resolver, para o 1º render já ter o usuário.
 */
export async function initAuth() {
  const { data } = await supabase.auth.getSession()
  setSession(data.session)
  supabase.auth.onAuthStateChange((evt, session) => {
    setSession(session)
    if (evt === 'PASSWORD_RECOVERY') _recovery = true
  })
  if (_session) await loadPerfil()
}

/**
 * A sessão atual nasceu de um link de recuperação? Duas fontes, porque o
 * evento PASSWORD_RECOVERY pode disparar antes de initAuth assinar o
 * listener: (a) a flag do evento; (b) a claim `amr` do access token —
 * link de recuperação autentica por otp/recovery, nunca por password.
 * Fail-closed: na dúvida (token ilegível), NÃO é recovery.
 */
function sessaoDeRecovery() {
  if (_recovery) return true
  const token = _session?.access_token
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return (payload.amr || []).some((m) => ['recovery', 'otp', 'magiclink'].includes(m?.method))
  } catch { return false }
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
/**
 * Purga todo dado local da sessão. Sem isto, as respostas do aluno (IndexedDB) e
 * as respostas do PostgREST cacheadas pelo service worker — incluindo a base
 * INTEIRA de leads quando um admin abre /resultado-das-pesquisas — ficam em
 * disco indefinidamente, legíveis por quem usar a máquina depois.
 */
async function purgarDadosLocais() {
  const tarefas = []
  if (typeof indexedDB !== 'undefined') {
    tarefas.push(new Promise((resolve) => {
      const req = indexedDB.deleteDatabase('workbook-cnhf')
      req.onsuccess = req.onerror = req.onblocked = () => resolve()
      setTimeout(resolve, 1500)                     // nunca travar o logout
    }))
  }
  if (typeof caches !== 'undefined') {
    tarefas.push(
      caches.keys()
        .then((ns) => Promise.all(ns.filter((n) => n.startsWith('wbcnhf')).map((n) => caches.delete(n))))
        .catch(() => {})
    )
  }
  // o SW ativo pode ser de outra versão, com caches que esta página não conhece
  try { navigator.serviceWorker?.controller?.postMessage({ tipo: 'purgar-sessao' }) } catch { /* sem SW */ }
  await Promise.all(tarefas).catch(() => {})
}

export async function logout() {
  // 1. estado local deslogado ANTES do await de rede: a guarda de rota lê
  //    currentUser() de forma síncrona e, se ainda houver sessão, devolve o
  //    aluno para o ambiente em vez de levá-lo ao login.
  setSession(null)
  // 2. zera o store em memória (singleton de módulo sobrevive à navegação SPA)
  try { const { store } = await import('./store.js'); store.reset() } catch { /* store pode nem ter sido carregado */ }
  // 3. encerra a sessão no servidor
  try { await supabase.auth.signOut() } catch { /* sessão local já foi embora */ }
  // 4. remove o que ficou em disco
  await purgarDadosLocais()
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
 * códigos de erro: NOT_REGISTERED | BAD_PASSWORD | INVALID
 *
 * ORÁCULO DE ENUMERAÇÃO (finding MÉDIO da auditoria de 26/07): distinguir
 * NOT_REGISTERED de BAD_PASSWORD confirma para um atacante quem é aluno.
 * A DECISÃO DE EXIBIÇÃO é de produto (João/F2) — por isso o comportamento
 * atual fica preservado por default e a opção `generic: true` devolve o
 * código único INVALID sem consultar a RPC email_eh_lead (nenhuma
 * pré-checagem de existência). Quando a decisão sair, basta o front
 * chamar login(email, senha, { generic: true }).
 */
export async function login(email, password, { generic = false } = {}) {
  const e = norm(email)
  const { data, error } = await supabase.auth.signInWithPassword({ email: e, password })
  if (error) {
    if (generic) return { ok: false, code: 'INVALID' }
    // legado: distingue "e-mail não cadastrado" de "senha errada" (oráculo)
    const ehLead = await isRegisteredLead(e)
    return { ok: false, code: ehLead ? 'BAD_PASSWORD' : 'NOT_REGISTERED' }
  }
  setSession(data.session)
  await loadPerfil()
  return { ok: true, surveyDone: await hasSurvey() }
}

/**
 * recuperarAcesso — FLUXO NOVO de recuperação SEM e-mail (contrato em
 * tmp/squad/extra-workbook.md): e-mail + telefone do cadastro + senha
 * nova, numa tela só. Fala com POST /api/recuperar-acesso (Express).
 *
 * A resposta do servidor é UNIFORME de propósito (nunca diz se o e-mail
 * existe ou se o telefone bateu) — o resultado real é descoberto AQUI,
 * tentando logar com a senha nova. Em sucesso o aluno já sai LOGADO.
 *
 * Retorna { ok: true, surveyDone } logado, ou { ok: false, code }:
 *   NO_MATCH   — dados não conferem com o cadastro (mensagem única:
 *                "E-mail e WhatsApp não conferem com o cadastro.")
 *   RATE_LIMIT — muitas tentativas; `retryAfterSeg` acompanha
 *   INVALID    — formato inválido (senha < 8, e-mail/telefone malformado)
 *   CONFIG     — servidor sem a chave admin configurada (avisar admin)
 *   NETWORK    — sem conexão com o servidor
 */
export async function recuperarAcesso({ email, telefone, senha }) {
  const e = norm(email)
  let r
  try {
    r = await fetch('/api/recuperar-acesso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e, telefone, senha }),
    })
  } catch { return { ok: false, code: 'NETWORK' } }

  if (r.status === 429) {
    const retryAfterSeg = Number(r.headers.get('Retry-After')) || 900
    return { ok: false, code: 'RATE_LIMIT', retryAfterSeg }
  }
  if (r.status === 503) return { ok: false, code: 'CONFIG' }
  if (!r.ok) return { ok: false, code: 'INVALID' }

  // resposta 200 é opaca — o teste de verdade é conseguir entrar
  const l = await supabase.auth.signInWithPassword({ email: e, password: senha })
  if (l.error) return { ok: false, code: 'NO_MATCH' }
  setSession(l.data.session)
  await loadPerfil()
  return { ok: true, surveyDone: await hasSurvey() }
}

/**
 * Auto-cadastro por convite. Cria o usuário no Auth com metadata
 * sistema='workbook' (o trigger cria perfil + lead com nome/profissao/telefone).
 * Retorna { ok, code, needsConfirm }.
 * códigos: EXISTS (e-mail já tem acesso) | ERROR
 */
export async function signUpConvite({ email, nome, senha, profissao, telefone }) {
  const e = norm(email)
  const { data, error } = await supabase.auth.signUp({
    email: e,
    password: senha,
    options: {
      data: {
        sistema: 'workbook',
        nome: nome || '',
        profissao: profissao || null,
        telefone: telefone || null,
      },
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
 * gerarSenha — senha aleatória legível (sem caracteres ambíguos), exibida
 * uma única vez no modal pós-pesquisa. O aluno copia e usa para entrar.
 */
export function gerarSenha(len = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let s = ''
  const buf = new Uint32Array(len)
  crypto.getRandomValues(buf)
  for (let i = 0; i < len; i++) s += chars[buf[i] % chars.length]
  return s
}

/**
 * signUpComPesquisa — FLUXO NOVO (porta de entrada do funil):
 * o lead responde a pesquisa SEM login; ao finalizar, criamos o acesso
 * com uma senha aleatória, gravamos as respostas e devolvemos a senha
 * para ser exibida no modal.
 *
 * Como a confirmação de e-mail está DESLIGADA no projeto, o signUp já
 * retorna sessão → gravamos a pesquisa autenticado (respeita a RLS).
 *
 * Retorna { ok, senha, email } em sucesso.
 * códigos de erro: EXISTS (e-mail já respondeu / já tem acesso) | ERROR
 */
export async function signUpComPesquisa({ email, nome, telefone, answers }) {
  const e = norm(email)
  const senha = gerarSenha()

  const { data, error } = await supabase.auth.signUp({
    email: e,
    password: senha,
    options: {
      data: {
        sistema: 'workbook',
        nome: nome || '',
        // o trigger handle_new_user grava telefone do raw_user_meta_data em workbook.leads
        telefone: telefone || null,
      },
      emailRedirectTo: `${location.origin}${location.pathname}`,
    },
  })
  if (error) {
    const code = /already|exist|registered/i.test(error.message) ? 'EXISTS' : 'ERROR'
    return { ok: false, code, message: error.message }
  }
  if (!data.session) {
    // projeto sem confirmação de e-mail deveria dar sessão direto;
    // se cair aqui, não conseguimos gravar a pesquisa autenticado.
    return { ok: false, code: 'NO_SESSION' }
  }
  setSession(data.session)
  await loadPerfil()

  // grava as respostas já autenticado (passa nome explícito: o perfil
  // recém-criado pode ainda não ter propagado no cache). O ACESSO já está
  // criado neste ponto — se o insert da pesquisa falhar (rede etc.), NÃO
  // travamos o lead com EXISTS numa retentativa: retornamos ok assim mesmo
  // (o acesso é o entregável) e sinalizamos surveyPending para uma retentativa.
  const reg = await submitSurvey(e, answers, nome, telefone)
  return { ok: true, senha, email: e, surveyPending: !reg.ok }
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
 * requestReset — LEGADO (fluxo por e-mail, substituído por recuperarAcesso).
 * Envia o e-mail nativo de redefinição do Supabase e responde de forma
 * UNIFORME: não pré-checa mais isRegisteredLead (era um oráculo de
 * enumeração — finding MÉDIO da auditoria de 26/07) e devolve { ok: true }
 * exista o e-mail ou não; o Supabase simplesmente não envia nada para
 * e-mail desconhecido. Retorna { ok, code }.
 */
export async function requestReset(email) {
  const e = norm(email)
  const { error } = await supabase.auth.resetPasswordForEmail(e, {
    redirectTo: `${location.origin}${location.pathname}#/redefinir-senha`,
  })
  // erro de rede/serviço ainda é reportado; "e-mail não existe" não é erro
  if (error && !/user|not.?found/i.test(error.message)) {
    return { ok: false, code: 'ERROR', message: error.message }
  }
  return { ok: true }
}

/**
 * resetPassword — LEGADO (fluxo por e-mail). TRAVADO a sessões de
 * recovery: antes trocava a senha de QUALQUER sessão ativa sem pedir a
 * senha atual (CWE-620, finding MÉDIO da auditoria de 26/07 — sessão
 * esquecida em máquina compartilhada virava tomada permanente da conta).
 * Agora só age quando a sessão nasceu de link de recuperação; sessão
 * comum deve usar changePassword (que revalida a senha atual).
 * códigos de erro: NOT_RECOVERY | BAD_TOKEN
 */
export async function resetPassword(_token, nova) {
  if (!sessaoDeRecovery()) return { ok: false, code: 'NOT_RECOVERY' }
  const { error } = await supabase.auth.updateUser({ password: nova })
  if (error) return { ok: false, code: 'BAD_TOKEN', message: error.message }
  _recovery = false // a troca consumiu a janela de recovery
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

export async function submitSurvey(_email, answers, nome, telefone) {
  const uid = currentUserId()
  if (!uid) return { ok: false, code: 'NO_SESSION' }
  const email = currentUser()

  // índice de saúde da resposta (qualidade + flags de priorização)
  const { score, flags } = avaliarSaude({ nome: nome ?? _perfil?.nome, email, answers })

  // deduplicação: já existe outra resposta com o mesmo e-mail ou telefone?
  const duplicado = await ehDuplicado({ uid, email, telefone })

  const registro = {
    user_id: uid,
    email,
    nome: nome ?? _perfil?.nome ?? '',
    telefone: telefone || null,
    answers,
    health_score: score,
    health_flags: flags,
    duplicado,
    atualizado_em: new Date().toISOString(),
  }
  const { error } = await supabase
    .from('respostas_pesquisa')
    .upsert(registro, { onConflict: 'user_id' })
  if (error) return { ok: false, code: 'ERROR', message: error.message }
  return { ok: true, score, flags, duplicado }
}

/**
 * ehDuplicado — o lead já aparece em OUTRA resposta (mesmo e-mail normalizado),
 * de um user_id diferente? Marca p/ o dashboard priorizar/limpar. RLS só deixa
 * o próprio user ler suas linhas, então a checagem cruzada roda via RPC
 * security definer. Se a RPC falhar, retorna false (não bloqueia o cadastro).
 */
async function ehDuplicado({ uid, email, telefone }) {
  try {
    const { data, error } = await supabase.rpc('resposta_duplicada', {
      p_user_id: uid, p_email: norm(email), p_telefone: telefone || null,
    })
    if (error) return false
    return !!data
  } catch { return false }
}

// normaliza p/ o formato que Resultados.vue espera (ts + answers)
const normalizarResultado = (r) => ({
  email: r.email,
  nome: r.nome,
  answers: r.answers || {},
  ts: r.atualizado_em || r.criado_em,
})

// ordenação ESTÁVEL: atualizado_em desc + user_id como desempate único —
// sem desempate, linhas com o mesmo timestamp mudam de posição entre
// páginas e registros somem/duplicam na paginação.
const ordenarResultados = (q) =>
  q.order('atualizado_em', { ascending: false, nullsFirst: false })
    .order('user_id', { ascending: false })

/**
 * getResultsPage — leitura PAGINADA da base (admin; RLS libera admin).
 * Preferir esta na UI: getAllResults carrega a base inteira em memória.
 * → { ok, rows, total, page, pageSize } (rows no formato de Resultados.vue)
 */
export async function getResultsPage({ page = 0, pageSize = 100 } = {}) {
  const tam = Math.min(Math.max(1, pageSize), 500) // teto por request
  const de = Math.max(0, page) * tam
  const { data, error, count } = await ordenarResultados(
    supabase
      .from('respostas_pesquisa')
      .select('email, nome, answers, criado_em, atualizado_em', { count: 'exact' })
  ).range(de, de + tam - 1)
  if (error) return { ok: false, rows: [], total: 0, page, pageSize: tam, message: error.message }
  return { ok: true, rows: (data || []).map(normalizarResultado), total: count ?? 0, page, pageSize: tam }
}

/**
 * getAllResults — admin only (RLS libera admin a ler todas).
 * COMPATÍVEL com a assinatura antiga (retorna o array completo), mas o
 * fetch agora é em PÁGINAS de 1000 com ordenação estável — a versão
 * anterior era uma query única sem limite (além de lenta, o PostgREST
 * corta silenciosamente no max-rows do servidor). Teto duro de 20k
 * linhas para nunca estourar a memória do browser; acima disso a UI
 * deve migrar para getResultsPage.
 */
export async function getAllResults({ maxLinhas = 20_000 } = {}) {
  const PAGINA = 1000
  const linhas = []
  for (let de = 0; de < maxLinhas; de += PAGINA) {
    const { data, error } = await ordenarResultados(
      supabase.from('respostas_pesquisa').select('email, nome, answers, criado_em, atualizado_em')
    ).range(de, de + PAGINA - 1)
    if (error) return linhas.map(normalizarResultado) // devolve o que já veio
    linhas.push(...(data || []))
    if (!data || data.length < PAGINA) break
  }
  return linhas.map(normalizarResultado)
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
// WORKBOOK / APOSTILA — preenchimento das lacunas por aluno
// ------------------------------------------------------------
// Uma linha por aluno em workbook.workbook_respostas; `respostas` é um
// jsonb chaveado pelo id da lacuna, com envelope por campo:
//   { "cap-1-l1": { "v": "1.116", "t": 1753500000000 } }
// Linhas LEGADAS gravaram string crua ({ "cap-1-l1": "1.116" }) — a
// leitura normaliza para { v, t: 0 }, então qualquer edição local
// (t > 0) sempre vence o dado antigo sem perdê-lo.
// O save faz READ → MERGE POR CAMPO (maior t vence) → UPSERT: nunca
// sobrescreve o mapa inteiro (duas abas não se apagam mais).
// ============================================================

/** o erro veio da rede (offline/timeout) e não de rejeição do servidor? */
function ehErroDeRede(err) {
  return /fetch|network|load failed|timeout|abort|conex/i.test(String(err?.message || err))
}

/** carrega as respostas do aluno logado → { ok, respostas: {id:{v,t}}, progresso } */
export async function getWorkbook() {
  const uid = currentUserId()
  if (!uid) return { ok: false, code: 'NO_SESSION', respostas: {}, progresso: {} }
  try {
    const { data, error } = await supabase
      .from('workbook_respostas')
      .select('respostas, progresso')
      .eq('user_id', uid)
      .maybeSingle()
    if (error) {
      return {
        ok: false, code: ehErroDeRede(error) ? 'NETWORK' : 'ERROR',
        message: error.message, respostas: {}, progresso: {},
      }
    }
    return {
      ok: true,
      respostas: normalizarRespostas(data?.respostas),
      progresso: data?.progresso || {},
    }
  } catch (e) {
    return { ok: false, code: 'NETWORK', message: String(e?.message || e), respostas: {}, progresso: {} }
  }
}

/**
 * salva respostas com merge por campo. `respostas` no envelope { id: {v,t} }.
 * Lê o estado remoto atual e mescla campo a campo (maior t vence) — se a
 * LEITURA falhar, NÃO grava às cegas (gravar sem merge reintroduziria o
 * bug de sobrescrita). Retorna { ok, respostas: mergeFinal, progresso }
 * para o store absorver campos em que o remoto venceu.
 * códigos de erro: NO_SESSION | NETWORK | ERROR
 */
export async function saveWorkbook(respostas, progresso) {
  const uid = currentUserId()
  if (!uid) return { ok: false, code: 'NO_SESSION' }

  const atual = await getWorkbook()
  if (!atual.ok) return { ok: false, code: atual.code, message: atual.message }

  const novo = aplicarSaveNoRow(atual, respostas, progresso)
  const registro = {
    user_id: uid,
    respostas: novo.respostas,
    progresso: novo.progresso,
    atualizado_em: new Date().toISOString(),
  }
  try {
    const { error } = await supabase
      .from('workbook_respostas')
      .upsert(registro, { onConflict: 'user_id' })
    if (error) {
      return { ok: false, code: ehErroDeRede(error) ? 'NETWORK' : 'ERROR', message: error.message }
    }
    return { ok: true, respostas: novo.respostas, progresso: novo.progresso }
  } catch (e) {
    return { ok: false, code: 'NETWORK', message: String(e?.message || e) }
  }
}

/**
 * saveWorkbookBeacon — último recurso ao fechar a aba (pagehide/beforeunload).
 * `navigator.sendBeacon` não aceita headers (apikey/Authorization), então
 * usamos fetch com `keepalive: true` direto no PostgREST — o browser completa
 * o request mesmo com a página fechando. LIMITAÇÃO: é um upsert sem
 * read-merge prévio; como o payload é o mapa local completo com timestamps
 * por campo, o merge do próximo sync de qualquer outra aba/dispositivo
 * corrige eventual corrida. Síncrono, fire-and-forget.
 */
export function saveWorkbookBeacon(respostas, progresso) {
  const uid = currentUserId()
  const token = _session?.access_token
  const base = SUPABASE_URL
  const anon = SUPABASE_ANON
  if (!uid || !token || !base || !anon) return false
  // token vencido (ou a segundos de vencer) → não dispara: o POST voltaria 401
  // e o .catch() engoliria, perdendo o último lote sem qualquer sinal.
  // `pendentes` fica intacto e o próximo boot drena pelo IndexedDB.
  const expira = Number(_session?.expires_at) || 0
  if (expira && expira * 1000 < Date.now() + 60_000) return false
  try {
    fetch(`${base}/rest/v1/workbook_respostas?on_conflict=user_id`, {
      method: 'POST',
      keepalive: true,
      headers: {
        apikey: anon,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Profile': 'workbook',           // client usa schema `workbook`
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        user_id: uid,
        respostas: respostas || {},
        progresso: progresso || {},
        atualizado_em: new Date().toISOString(),
      }),
    }).catch(() => {})
    return true
  } catch { return false }
}

// ============================================================
// ADMIN
// ============================================================
export async function isAdmin() {
  if (!_perfil) await loadPerfil()
  return _perfil?.role === 'admin'
}
