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

function setSession(session) {
  _session = session
  if (!session) { _perfil = null }
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
  })
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
 * `generic: true` é o caminho ATUAL (exclusivo do acesso interno/admin):
 * devolve o código único INVALID em qualquer falha, sem pré-checagem de
 * existência de e-mail (sem oráculo de enumeração).
 */
export async function login(email, password, { generic = false } = {}) {
  const e = norm(email)
  const { data, error } = await supabase.auth.signInWithPassword({ email: e, password })
  if (error) {
    return { ok: false, code: 'INVALID' }
  }
  setSession(data.session)
  await loadPerfil()
  return { ok: true, surveyDone: await hasSurvey() }
}

/**
 * entrar — LOGIN CRU (decisão do dono do produto, 2026-08-11): o aluno
 * prova identidade só com o e-mail. Sem senha, sem WhatsApp, sem dados da
 * pesquisa, sem recuperação. O servidor devolve um magic link do GoTrue,
 * que trocamos por sessão aqui.
 *
 * Por que `verifyOtp` e não abrir o link: navegar para o action_link faria
 * o browser sair da SPA e voltar por redirect, perdendo o estado. O token
 * do link é consumido direto — mesmo efeito, sem round-trip visível.
 *
 * Retorna { ok: true, surveyDone } já logado, ou { ok: false, code }:
 *   NAO_CADASTRADO | ADMIN_PRECISA_SENHA | RATE_LIMIT (+retryAfterSeg) |
 *   INVALID | CONFIG | NETWORK | ERRO
 */
export async function entrar(email) {
  const e = norm(email)

  let r
  try {
    r = await fetch('/api/entrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e }),
    })
  } catch { return { ok: false, code: 'NETWORK' } }

  if (r.status === 429) {
    const retryAfterSeg = Number(r.headers.get('Retry-After')) || 900
    return { ok: false, code: 'RATE_LIMIT', retryAfterSeg }
  }
  if (r.status === 503) return { ok: false, code: 'CONFIG' }

  // ATENÇÃO: fetch não lança em erro HTTP — checar o corpo, não só o status.
  let dados = null
  try { dados = await r.json() } catch { return { ok: false, code: 'NETWORK' } }
  if (!r.ok || !dados?.ok || !dados?.token_hash) {
    const conhecidos = ['NAO_CADASTRADO', 'ADMIN_PRECISA_SENHA', 'INVALID', 'CONFIG']
    return { ok: false, code: conhecidos.includes(dados?.code) ? dados.code : 'ERRO', mensagem: dados?.mensagem }
  }

  // O servidor manda o `hashed_token` do GoTrue (não o action_link): o token
  // da querystring do link é o BRUTO e o verify responde 403 otp_expired.
  const v = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: dados.token_hash })
  if (v.error || !v.data?.session) return { ok: false, code: 'ERRO' }

  setSession(v.data.session)
  await loadPerfil()
  return { ok: true, surveyDone: await hasSurvey() }
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
 * signUpComPesquisa — porta de entrada do funil: o lead responde a
 * pesquisa SEM login; ao finalizar, criamos o acesso com uma senha
 * aleatória (o Auth exige senha, mas ela nunca é exibida — login é
 * cru, só por e-mail) e gravamos as respostas.
 *
 * Como a confirmação de e-mail está DESLIGADA no projeto, o signUp já
 * retorna sessão → gravamos a pesquisa autenticado (respeita a RLS), e o
 * aluno já sai logado direto para o ambiente.
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

// ============================================================
// GRUPO DE WHATSAPP — CTA no ambiente para quem ainda não entrou
// ------------------------------------------------------------
// Os links do Sendflow vivem só no server.js (rotas /api/grupo e
// /api/grupo/telefone). O front nunca hardcoda link nenhum: ele chega
// pronto na resposta, ou não chega. Fail-closed em qualquer situação
// que não seja um 200 com corpo bem formado — ATENÇÃO: fetch não lança
// em erro HTTP, `res.ok` tem que ser checado explicitamente.
// ============================================================
const SEM_GRUPO = { ok: false, mostrar: false, area: null, link: null, precisaTelefone: false }

/** status do CTA de grupo do aluno logado → { ok, mostrar, area, link, precisaTelefone } */
export async function statusGrupo() {
  const token = _session?.access_token
  if (!token) return SEM_GRUPO
  let r
  try {
    r = await fetch('/api/grupo', {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch { return SEM_GRUPO }
  if (!r.ok) return SEM_GRUPO
  let dados = null
  try { dados = await r.json() } catch { return SEM_GRUPO }
  if (!dados?.ok) return SEM_GRUPO
  return {
    ok: true,
    mostrar: !!dados.mostrar,
    area: dados.area ?? null,
    link: dados.link ?? null,
    precisaTelefone: !!dados.precisaTelefone,
  }
}

/**
 * informarTelefoneGrupo — o aluno preenche o WhatsApp que faltava no
 * cadastro para liberar o link do grupo do segmento dele.
 * → { ok, mostrar, link, jaEstava } em sucesso, ou { ok:false, code, mensagem }
 * em qualquer falha — códigos conhecidos: INVALID | RATE_LIMIT | ERRO.
 * Fail-closed: uma resposta de erro NUNCA repassa `link` nem `mostrar:true`.
 */
export async function informarTelefoneGrupo(telefone) {
  const token = _session?.access_token
  if (!token) return { ok: false }
  let r
  try {
    r = await fetch('/api/grupo/telefone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ telefone }),
    })
  } catch { return { ok: false } }

  if (r.status === 429) {
    const retryAfterSeg = Number(r.headers.get('Retry-After')) || 900
    return { ok: false, code: 'RATE_LIMIT', retryAfterSeg }
  }

  // ATENÇÃO: fetch não lança em erro HTTP — checar o corpo, não só o status.
  let dados = null
  try { dados = await r.json() } catch { return { ok: false } }
  if (!r.ok || !dados?.ok) {
    const conhecidos = ['INVALID', 'RATE_LIMIT']
    return { ok: false, code: conhecidos.includes(dados?.code) ? dados.code : 'ERRO', mensagem: dados?.mensagem }
  }
  return {
    ok: true,
    mostrar: !!dados.mostrar,
    link: dados.link ?? null,
    jaEstava: !!dados.jaEstava,
  }
}
