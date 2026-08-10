/* ============================================================
   SERVIDOR DE PRODUÇÃO — Workbook CNHF
   ------------------------------------------------------------
   Serve o build (dist/) do Vite e faz o fallback de SPA.

   Robustez para Hostinger Node app: o processo pode ser reiniciado
   num contexto onde o dist/ ainda não está visível. Para nunca cair
   em 503 permanente:
     1) o servidor sobe IMEDIATAMENTE (health responde sempre);
     2) o caminho do dist/ é resolvido A CADA request (não fixado no boot);
     3) se o dist/ faltar, disparamos "npm run build" UMA vez em background
        (não-bloqueante) e servimos uma página "preparando..." com auto-reload
        até o build ficar pronto — sem travar o event loop nem matar o processo.

   Startup:  npm install → npm start   (o start builda se necessário)
   ============================================================ */

import express from 'express'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { randomInt } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || '0.0.0.0'

/*
  Subir o servidor é o comportamento PADRÃO. Testes que só querem importar o
  `app` e as funções puras setam WORKBOOK_NO_LISTEN=1.

  Antes isto era uma heurística (`import.meta.url === process.argv[1]`) e ela
  DERRUBOU A PRODUÇÃO: a Hostinger não roda `node server.js` direto — carrega o
  app por um wrapper (Passenger), então argv[1] não bate, o listen nunca era
  chamado e o proxy devolvia 503 em tudo, inclusive no /health.

  A regra: em caso de dúvida, ESCUTAR. Um teste que sobe um listener à toa é um
  aborrecimento; um servidor que não sobe é uma queda.
*/
const EH_MAIN = process.env.WORKBOOK_NO_LISTEN !== '1'

// Resolve o dist/ dinamicamente: o cwd do runtime pode diferir do dir do
// server.js. Retorna o 1º candidato que tenha index.html, ou null.
function resolveDist() {
  const candidatos = [
    join(__dirname, 'dist'),
    join(process.cwd(), 'dist'),
    join(__dirname, '..', 'dist'),
  ]
  return candidatos.find((d) => existsSync(join(d, 'index.html'))) || null
}

// Dispara o build no máximo uma vez por processo, em background.
let building = false
function ensureBuild() {
  if (building || resolveDist()) return
  building = true
  console.warn('[workbook] dist/ ausente — iniciando "npm run build" em background...')
  const p = spawn('npm', ['run', 'build'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true, // necessário no Windows e em alguns ambientes de hospedagem
  })
  p.on('exit', (code) => {
    building = false
    console.log(`[workbook] build finalizado (code=${code}); dist ok=${!!resolveDist()}`)
  })
  p.on('error', (e) => {
    building = false
    console.error('[workbook] falha ao iniciar build:', e.message)
  })
}

const app = express()
app.set('trust proxy', true) // HTTPS/IP real atrás do proxy da hospedagem

// Headers de segurança — PRIMEIRA middleware, antes de qualquer rota, para
// valer também no /health e na página de "preparando…".
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', CSP)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(self)')
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  // o SW é o arquivo com maior poder na origem: nunca servir versão velha dele
  if (req.path.endsWith('/sw.js')) res.setHeader('Cache-Control', 'no-cache')
  next()
})

// Healthcheck — responde SEMPRE, independente do dist/.
app.get('/health', (_req, res) =>
  res.json({
    ok: true,
    service: 'workbook-cnhf',
    distOk: !!resolveDist(),
    building,
    // diagnóstico de configuração — BOOLEANO, nunca o valor da chave.
    // srvKey:false => /api/recuperar-acesso responde 503. Causas usuais:
    // env não salva, nome diferente, ou app não reiniciado após salvar.
    srvKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    srvKeyLen: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').length,
  })
)

// ============================================================
// POST /api/recuperar-acesso — recuperação de acesso SEM e-mail
// ------------------------------------------------------------
// O aluno deslogado informa e-mail + telefone do cadastro + nova
// senha. Se (e-mail, telefone) conferirem com o cadastro, a senha é
// trocada via service_role (Admin API do GoTrue). Decisão de produto
// registrada em tmp/squad/extra-workbook.md (riscos aceitos).
//
// Propriedades de segurança OBRIGATÓRIAS deste endpoint:
//  1. RESPOSTA UNIFORME: sucesso, e-mail inexistente, telefone errado e
//     até erro interno pós-validação devolvem o MESMO status (200) e o
//     MESMO corpo. Um 500 só no caminho do update revelaria que o par
//     (e-mail, telefone) confere — por isso erro interno também responde
//     uniforme (fica só no log). O front descobre o resultado tentando
//     logar com a senha nova.
//  2. TEMPO CONSTANTE-ISH: todas as consultas rodam em paralelo nos dois
//     caminhos e a resposta é segurada até um piso de tempo + jitter.
//     Se o trabalho real estourar o piso, logamos aviso (observável).
//  3. RATE LIMIT por IP e por e-mail com bloqueio progressivo.
//     LIMITAÇÃO CONHECIDA: o estado é EM MEMÓRIA — vale porque a
//     Hostinger roda UM processo; com N processos/instâncias cada um
//     teria contador próprio (multiplica o limite por N) e reiniciar o
//     processo zera os contadores. Se um dia houver cluster, mover para
//     Redis/tabela.
//  4. service_role SÓ AQUI, lida de env. Sem a env o endpoint responde
//     503 explícito (nunca "sempre nega" silencioso) e o boot loga alto.
//  5. AUDITORIA: toda tentativa vira uma linha [auditoria] no stdout
//     (e-mail, IP, resultado, motivo, ms) — hoje não havia registro
//     nenhum de troca de senha. (Follow-up: persistir em tabela.)
// ============================================================

const SUPABASE_URL_SRV =
  (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://mbvybujpkwuorhtdzcde.supabase.co').replace(/\/+$/, '')
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SERVICE_ROLE_KEY) {
  console.error(
    '[workbook] ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY ausente — ' +
    'POST /api/recuperar-acesso vai responder 503 até a env ser configurada.'
  )
}

// client admin: bypassa RLS e fala com a Admin API do GoTrue. NUNCA importar
// nada daqui em src/ — este arquivo não entra no bundle do Vite.
// Timeout em toda chamada externa: uma pendurada não pode segurar o handler.
const admin = SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL_SRV, SERVICE_ROLE_KEY, {
      db: { schema: 'workbook' },
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init = {}) =>
          fetch(input, { ...init, cache: 'no-store', signal: AbortSignal.timeout(8000) }),
      },
    })
  : null

// ---------- normalização de telefone (BR) ----------
/**
 * Reduz um telefone brasileiro a uma forma canônica só-dígitos:
 * remove máscara, zeros de tronco ("011"), o +55 (sem confundir com o
 * DDD 55, que existe — só remove quando sobram >= 12 dígitos) e o
 * 9º dígito de celular (11 dígitos com "9" na 3ª posição → 10).
 * Ex.: "+55 (11) 98765-4321" → "1187654321".
 */
export function normalizarTelefone(bruto) {
  let d = String(bruto || '').replace(/\D+/g, '')
  d = d.replace(/^0+/, '')                                  // 011 98765... → 11 98765...
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2)  // +55 — mas nunca um DDD 55 sozinho
  d = d.replace(/^0+/, '')                                  // "+55 011..." deixa 0 sobrando
  if (d.length === 11 && d[2] === '9') d = d.slice(0, 2) + d.slice(3) // 9º dígito
  return d
}

/**
 * O telefone digitado confere com o do cadastro? Compara as formas
 * canônicas; se um dos lados foi digitado SEM DDD (<= 9 dígitos),
 * compara os 8 dígitos finais. DDDs diferentes com mesmo número local
 * NÃO conferem (os dois lados com DDD exigem igualdade exata).
 */
export function telefonesEquivalentes(a, b) {
  const na = normalizarTelefone(a)
  const nb = normalizarTelefone(b)
  if (na.length < 8 || nb.length < 8) return false
  if (na === nb) return true
  const umSemDdd = na.length <= 9 || nb.length <= 9
  return umSemDdd && na.slice(-8) === nb.slice(-8)
}

// ---------- normalização de dados de identidade (recuperação por cadastro) ----------
/**
 * Forma canônica de um nome para comparação tolerante: minúsculas, sem acento,
 * sem pontuação, espaços colapsados. "José  DA Silva." → "jose da silva".
 * Assim o aluno recupera mesmo digitando com/sem acento ou caixa diferente,
 * sem afrouxar a ponto de nomes distintos colidirem.
 */
export function normalizarNome(bruto) {
  return String(bruto || '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '') // tira acento (combining marks)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')                     // pontuação → espaço
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * O nome digitado confere com o do cadastro? Exige igualdade da forma canônica
 * OU que um seja contido no outro por TODAS as palavras (cobre quem cadastrou
 * "Maria Santos" e digita "Maria de Fátima Santos", ou vice-versa) — desde que
 * haja ao menos nome + sobrenome (2 palavras) para não casar por um só termo.
 */
export function nomesEquivalentes(a, b) {
  const na = normalizarNome(a)
  const nb = normalizarNome(b)
  if (!na || !nb) return false
  if (na === nb) return true
  const pa = na.split(' ').filter(Boolean)
  const pb = nb.split(' ').filter(Boolean)
  if (pa.length < 2 || pb.length < 2) return false
  const menor = pa.length <= pb.length ? pa : pb
  const maiorSet = new Set(pa.length <= pb.length ? pb : pa)
  return menor.every((w) => maiorSet.has(w))
}

/** Comparação exata de opção de múltipla escolha (trim, sem diferença de caixa). */
export function opcaoIgual(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()
}

// ---------- rate limit em memória (ver LIMITAÇÃO no cabeçalho) ----------
const RL = {
  janelaMs: Number(process.env.RL_JANELA_MS) || 15 * 60_000,
  maxEmail: Number(process.env.RL_MAX_EMAIL) || 5,
  maxIp: Number(process.env.RL_MAX_IP) || 20,
  bloqueioBaseMs: 15 * 60_000,
  bloqueioMaxMs: 24 * 3_600_000,
  maxChaves: 50_000, // teto duro de memória (~poucos MB)
  mapa: new Map(),   // chave → { hits: [ts], bloqueadoAte, violacoes }
}

/**
 * Registra a tentativa nas duas dimensões e devolve o timestamp até o qual
 * está bloqueado (0 = passa). Bloqueio progressivo: cada estouro dobra a
 * duração (15min → 30 → 60 → ... → 24h).
 */
function limitar(ip, email) {
  const agora = Date.now()
  let bloqueadoAte = 0
  for (const { chave, max } of [
    { chave: `ip:${ip}`, max: RL.maxIp },
    { chave: `em:${email}`, max: RL.maxEmail },
  ]) {
    let r = RL.mapa.get(chave)
    if (!r) { r = { hits: [], bloqueadoAte: 0, violacoes: 0 }; RL.mapa.set(chave, r) }
    if (r.bloqueadoAte > agora) { bloqueadoAte = Math.max(bloqueadoAte, r.bloqueadoAte); continue }
    r.hits = r.hits.filter((t) => agora - t < RL.janelaMs)
    r.hits.push(agora)
    if (r.hits.length > max) {
      r.violacoes += 1
      r.bloqueadoAte = agora + Math.min(RL.bloqueioBaseMs * 2 ** (r.violacoes - 1), RL.bloqueioMaxMs)
      r.hits = []
      bloqueadoAte = Math.max(bloqueadoAte, r.bloqueadoAte)
    }
  }
  return bloqueadoAte
}

// faxina periódica + teto duro (nunca crescer sem limite)
setInterval(() => {
  const agora = Date.now()
  for (const [chave, r] of RL.mapa) {
    const ocioso = !r.hits.length || agora - r.hits[r.hits.length - 1] > RL.janelaMs
    if (r.bloqueadoAte < agora && ocioso) RL.mapa.delete(chave)
  }
  let excesso = RL.mapa.size - RL.maxChaves
  for (const chave of RL.mapa.keys()) { if (excesso-- <= 0) break; RL.mapa.delete(chave) }
}, 5 * 60_000).unref()

/**
 * IP do cliente para rate limit. `trust proxy: true` faz req.ip ser o
 * PRIMEIRO X-Forwarded-For — que o cliente controla (spoof trivial do
 * limite por IP). Usamos o ÚLTIMO salto do XFF (acrescentado pelo proxy
 * da hospedagem) ou o endereço do socket quando não há proxy.
 */
function ipCliente(req) {
  const xff = String(req.headers['x-forwarded-for'] || '')
    .split(',').map((s) => s.trim()).filter(Boolean)
  return xff.length ? xff[xff.length - 1] : (req.socket?.remoteAddress || 'desconhecido')
}

// ---------- helpers do handler ----------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RESPOSTA_UNIFORME = Object.freeze({
  ok: true,
  mensagem: 'Se os dados conferirem com o cadastro, sua senha foi atualizada. Entre com a nova senha.',
})
const PISO_MS = 1200 // > pior caso observado das chamadas ao Supabase

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

function auditar(evento) {
  // stdout = log da Node app na Hostinger. Follow-up: persistir em tabela.
  console.log('[auditoria][recuperar-acesso]', JSON.stringify({ ts: new Date().toISOString(), ...evento }))
}

/** user do Auth por e-mail (via Admin API; generateLink não envia e-mail). */
async function buscarUsuario(email) {
  const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email })
  if (error) return null // "User not found" cai aqui — indistinguível na resposta
  return data?.user || null
}

/**
 * Telefones em arquivo para o e-mail: workbook.leads (gravado pelo trigger
 * no signUp) e workbook.respostas_pesquisa (informado na pesquisa).
 * Erro de schema/tabela NÃO vira negação silenciosa: loga alto e segue
 * com a outra fonte.
 */
async function buscarTelefones(email) {
  const fontes = ['leads', 'respostas_pesquisa']
  const resultados = await Promise.all(fontes.map(async (tabela) => {
    const { data, error } = await admin.from(tabela).select('telefone').eq('email', email)
    if (error) {
      console.error(`[workbook] recuperar-acesso: falha lendo ${tabela}:`, error.message)
      return []
    }
    return (data || []).map((r) => r.telefone).filter(Boolean)
  }))
  return resultados.flat()
}

/**
 * Dados de identidade em arquivo para o e-mail — usados no 2º caminho de
 * recuperação (para quem não lembra/trocou o WhatsApp): o nome do perfil e as
 * respostas de pesquisa `area` (profissão) e `faturamento`, ambas de múltipla
 * escolha. O nome é buscado pelo user_id do Auth (perfis não tem coluna email);
 * as respostas, por email. Erro de leitura não vira negação silenciosa: loga e
 * segue (a comparação simplesmente não vai bater, resposta uniforme mantida).
 */
async function buscarIdentidade(email, usuario) {
  const [perfil, respostas] = await Promise.all([
    usuario?.id
      ? admin.from('perfis').select('nome').eq('user_id', usuario.id).maybeSingle()
          .then((r) => { if (r.error) console.error('[workbook] recuperar-acesso: falha lendo perfis:', r.error.message); return r.data })
      : Promise.resolve(null),
    admin.from('respostas_pesquisa').select('answers').eq('email', email)
      .then((r) => { if (r.error) console.error('[workbook] recuperar-acesso: falha lendo respostas_pesquisa:', r.error.message); return r.data || [] }),
  ])
  const nomes = []
  if (perfil?.nome) nomes.push(perfil.nome)
  const areas = []
  const faturamentos = []
  for (const row of respostas) {
    const a = row?.answers
    if (a && typeof a === 'object') {
      if (a.area) areas.push(a.area)
      if (a.faturamento) faturamentos.push(a.faturamento)
    }
  }
  return { nomes, areas, faturamentos }
}

app.post('/api/recuperar-acesso', express.json({ limit: '8kb' }), async (req, res) => {
  const t0 = Date.now()
  const ip = ipCliente(req)
  const email = String(req.body?.email || '').trim().toLowerCase()
  const senha = typeof req.body?.senha === 'string' ? req.body.senha : ''
  // Dois caminhos de prova de identidade:
  //  - 'telefone' (padrão): e-mail + WhatsApp do cadastro
  //  - 'dados': para quem não lembra/trocou o número — e-mail + nome completo
  //    + faturamento + área (respostas de múltipla escolha da pesquisa)
  const modo = req.body?.modo === 'dados' ? 'dados' : 'telefone'
  const telefone = typeof req.body?.telefone === 'string' ? req.body.telefone : ''
  const nome = typeof req.body?.nome === 'string' ? req.body.nome : ''
  const faturamento = typeof req.body?.faturamento === 'string' ? req.body.faturamento : ''
  const area = typeof req.body?.area === 'string' ? req.body.area : ''

  // sem service_role: erro EXPLÍCITO, nunca degradar para "sempre nega"
  if (!admin) {
    auditar({ email, ip, resultado: 'config', motivo: 'SUPABASE_SERVICE_ROLE_KEY ausente' })
    return res.status(503).json({ ok: false, code: 'CONFIG', mensagem: 'Recuperação de acesso indisponível no momento.' })
  }

  // rate limit ANTES de qualquer trabalho (conta inclusive tentativas inválidas)
  const bloqueadoAte = limitar(ip, email)
  if (bloqueadoAte) {
    const seg = Math.ceil((bloqueadoAte - Date.now()) / 1000)
    auditar({ email, ip, resultado: 'rate_limit', bloqueadoPorSeg: seg })
    return res.status(429).set('Retry-After', String(seg))
      .json({ ok: false, code: 'RATE_LIMIT', mensagem: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' })
  }

  // validação de formato — depende só do input, não do banco (não vaza estado)
  const emailSenhaOk = EMAIL_RE.test(email) && email.length <= 254 && senha.length >= 8 && senha.length <= 72
  const digitos = telefone.replace(/\D+/g, '')
  const formatoOk = modo === 'dados'
    ? emailSenhaOk && normalizarNome(nome).split(' ').filter(Boolean).length >= 2
        && !!faturamento && !!area && nome.length <= 120 && faturamento.length <= 60 && area.length <= 60
    : emailSenhaOk && digitos.length >= 8 && digitos.length <= 13
  if (!formatoOk) {
    auditar({ email, ip, modo, resultado: 'invalido' })
    const msg = modo === 'dados'
      ? 'Dados inválidos. Confira e-mail, nome completo, faturamento, área e a senha (mínimo 8 caracteres).'
      : 'Dados inválidos. Confira e-mail, WhatsApp e a senha (mínimo 8 caracteres).'
    return res.status(400).json({ ok: false, code: 'INVALID', mensagem: msg })
  }

  let resultado = 'sem_match'
  let motivo = ''
  try {
    // o usuário do Auth é comum aos dois modos; busca em paralelo com o resto
    const usuario = await buscarUsuario(email)
    let confere = false
    if (modo === 'dados') {
      const { nomes, areas, faturamentos } = await buscarIdentidade(email, usuario)
      const nomeOk = nomes.some((n) => nomesEquivalentes(n, nome))
      const areaOk = areas.some((a) => opcaoIgual(a, area))
      const fatOk = faturamentos.some((f) => opcaoIgual(f, faturamento))
      confere = !!usuario && nomeOk && areaOk && fatOk
      if (!confere) {
        motivo = !usuario ? 'email_nao_cadastrado'
          : !nomes.length ? 'sem_identidade_no_cadastro'
          : !nomeOk ? 'nome_nao_confere'
          : !areaOk ? 'area_nao_confere'
          : 'faturamento_nao_confere'
      }
    } else {
      const telefones = await buscarTelefones(email)
      confere = !!usuario && telefones.some((t) => telefonesEquivalentes(t, telefone))
      if (!confere) {
        motivo = !usuario ? 'email_nao_cadastrado'
          : telefones.length === 0 ? 'sem_telefone_no_cadastro'
          : 'telefone_nao_confere'
      }
    }
    if (confere) {
      const { error } = await admin.auth.admin.updateUserById(usuario.id, { password: senha })
      if (error) { resultado = 'erro'; motivo = error.message }
      else resultado = 'sucesso'
    }
  } catch (e) {
    resultado = 'erro'
    motivo = String(e?.message || e)
  }

  const decorridoMs = Date.now() - t0
  auditar({ email, ip, modo, resultado, motivo, decorridoMs })
  if (decorridoMs > PISO_MS) {
    console.warn(`[workbook] recuperar-acesso estourou o piso de tempo (${decorridoMs}ms > ${PISO_MS}ms) — piso não está mascarando o timing`)
  }
  await dormir(Math.max(0, PISO_MS + randomInt(0, 150) - (Date.now() - t0)))
  // resposta ÚNICA para sucesso, não-match e erro interno (ver cabeçalho)
  return res.status(200).json(RESPOSTA_UNIFORME)
})

// ============================================================
// POST /api/entrar — LOGIN SEM SENHA (decisão do Marcio, 2026-08-10)
// ------------------------------------------------------------
// O aluno NÃO tem mais senha. Prova identidade com e-mail + WhatsApp do
// cadastro (ou e-mail + nome/profissão/faturamento da pesquisa) e recebe
// um magic link do GoTrue, que o front troca por sessão.
//
// Reusa DELIBERADAMENTE a mesma verificação do /api/recuperar-acesso
// (buscarUsuario/buscarTelefones/buscarIdentidade + normalizadores): a
// regra de "quem é você" tem que ser UMA só — duas cópias divergem.
//
// Diferenças de segurança em relação ao endpoint acima:
//  - NÃO usa resposta uniforme: aqui o front precisa do link para logar.
//    O oráculo que isso abre (descobrir se um e-mail é cadastrado) já
//    existe hoje via `email_eh_lead` (ver "Pendências" no CLAUDE.md), e
//    sem retornar o link não há como entrar sem senha.
//  - Mantidos: rate limit por IP+e-mail, auditoria e validação de formato.
// ============================================================
app.post('/api/entrar', express.json({ limit: '8kb' }), async (req, res) => {
  const t0 = Date.now()
  const ip = ipCliente(req)
  const email = String(req.body?.email || '').trim().toLowerCase()
  const modo = req.body?.modo === 'dados' ? 'dados' : 'telefone'
  const telefone = typeof req.body?.telefone === 'string' ? req.body.telefone : ''
  const nome = typeof req.body?.nome === 'string' ? req.body.nome : ''
  const faturamento = typeof req.body?.faturamento === 'string' ? req.body.faturamento : ''
  const area = typeof req.body?.area === 'string' ? req.body.area : ''

  if (!admin) {
    auditar({ email, ip, evento: 'entrar', resultado: 'config', motivo: 'SUPABASE_SERVICE_ROLE_KEY ausente' })
    return res.status(503).json({ ok: false, code: 'CONFIG', mensagem: 'Entrada indisponível no momento.' })
  }

  const bloqueadoAte = limitar(ip, email)
  if (bloqueadoAte) {
    const seg = Math.ceil((bloqueadoAte - Date.now()) / 1000)
    auditar({ email, ip, evento: 'entrar', resultado: 'rate_limit', bloqueadoPorSeg: seg })
    return res.status(429).set('Retry-After', String(seg))
      .json({ ok: false, code: 'RATE_LIMIT', mensagem: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' })
  }

  // mesma validação de formato do outro endpoint, SEM o campo senha
  const emailOk = EMAIL_RE.test(email) && email.length <= 254
  const digitos = telefone.replace(/\D+/g, '')
  const formatoOk = modo === 'dados'
    ? emailOk && normalizarNome(nome).split(' ').filter(Boolean).length >= 2
        && !!faturamento && !!area && nome.length <= 120 && faturamento.length <= 60 && area.length <= 60
    : emailOk && digitos.length >= 8 && digitos.length <= 13
  if (!formatoOk) {
    auditar({ email, ip, evento: 'entrar', modo, resultado: 'invalido' })
    const msg = modo === 'dados'
      ? 'Confira o e-mail, o nome completo, a profissão e a faixa de faturamento que você informou na pesquisa.'
      : 'Confira o e-mail e o WhatsApp que você informou na pesquisa.'
    return res.status(400).json({ ok: false, code: 'INVALID', mensagem: msg })
  }

  let resultado = 'sem_match'
  let motivo = ''
  let link = ''
  try {
    const usuario = await buscarUsuario(email)
    let confere = false
    if (modo === 'dados') {
      const { nomes, areas, faturamentos } = await buscarIdentidade(email, usuario)
      const nomeOk = nomes.some((n) => nomesEquivalentes(n, nome))
      const areaOk = areas.some((a) => opcaoIgual(a, area))
      const fatOk = faturamentos.some((f) => opcaoIgual(f, faturamento))
      confere = !!usuario && nomeOk && areaOk && fatOk
      if (!confere) {
        motivo = !usuario ? 'email_nao_cadastrado'
          : !nomes.length ? 'sem_identidade_no_cadastro'
          : !nomeOk ? 'nome_nao_confere'
          : !areaOk ? 'area_nao_confere'
          : 'faturamento_nao_confere'
      }
    } else {
      const telefones = await buscarTelefones(email)
      confere = !!usuario && telefones.some((t) => telefonesEquivalentes(t, telefone))
      if (!confere) {
        motivo = !usuario ? 'email_nao_cadastrado'
          : telefones.length === 0 ? 'sem_telefone_no_cadastro'
          : 'telefone_nao_confere'
      }
    }

    if (confere) {
      // magiclink: o GoTrue devolve o action_link mesmo sem SMTP configurado
      const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
      const action = data?.properties?.action_link || ''
      if (error || !action) {
        resultado = 'erro'
        motivo = error?.message || 'sem action_link'
      } else {
        link = action
        resultado = 'sucesso'
      }
    }
  } catch (e) {
    resultado = 'erro'
    motivo = String(e?.message || e)
  }

  const decorridoMs = Date.now() - t0
  auditar({ email, ip, evento: 'entrar', modo, resultado, motivo, decorridoMs })

  if (resultado === 'sucesso') {
    return res.status(200).json({ ok: true, link })
  }
  // não-match e erro interno respondem igual (não distinguir os dois)
  return res.status(200).json({
    ok: false,
    code: 'SEM_MATCH',
    mensagem: modo === 'dados'
      ? 'Não encontramos um cadastro com esses dados. Confira o e-mail, o nome, a profissão e o faturamento que você informou na pesquisa.'
      : 'Não encontramos um cadastro com esse e-mail e WhatsApp. Confira os dados que você informou na pesquisa.',
  })
})

// JSON malformado no body não pode virar página de erro HTML do Express
app.use('/api', (err, _req, res, next) => {
  if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ ok: false, code: 'INVALID', mensagem: 'Corpo da requisição inválido.' })
  }
  next(err)
})

/*
  Headers de segurança. Importam desproporcionalmente aqui por causa do gerador
  de livro: book-print.js abre `about:blank` via window.open + document.write, e
  esse documento HERDA a origem do app — uma regressão de escape ali viraria
  execução same-origin com acesso ao localStorage (refresh token do Supabase).
  A CSP do documento pai é herdada pelo about:blank e é a rede de proteção.

  'unsafe-inline' em style-src é necessário: o book-render.js injeta <style> e
  atributos style= no HTML do livro. script-src fica sem exceção nenhuma.
  microphone=(self) porque o ditado por voz usa a Web Speech API.
*/
const SUPABASE_ORIGEM = (process.env.VITE_SUPABASE_URL || 'https://mbvybujpkwuorhtdzcde.supabase.co').replace(/\/+$/, '')
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self' ${SUPABASE_ORIGEM} wss://${new URL(SUPABASE_ORIGEM).host}`,
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "object-src 'none'",
  "form-action 'self'",
].join('; ')

// Estáticos + fallback SPA, resolvendo o dist/ a cada request.
app.use((req, res, next) => {
  const dist = resolveDist()
  if (!dist) {
    ensureBuild()
    // Página leve de "preparando" com auto-reload — evita tela de erro crua.
    return res
      .status(503)
      .set('Retry-After', '5')
      .type('html')
      .send(
        '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="5">' +
        '<title>Preparando…</title>' +
        '<body style="font:16px system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#0b0b0c;color:#eee">' +
        '<div style="text-align:center"><p>Preparando o ambiente…</p>' +
        '<p style="opacity:.6;font-size:13px">Isto leva alguns segundos. A página recarrega sozinha.</p></div>'
      )
  }
  // serve estáticos deste dist/
  express.static(dist, {
    index: false,
    setHeaders(r, filePath) {
      if (/[\\/]assets[\\/]/.test(filePath)) {
        r.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      }
    },
  })(req, res, () => {
    // não é arquivo estático → fallback SPA
    res.sendFile(join(dist, 'index.html'), (err) => {
      if (err && !res.headersSent) res.status(500).end()
    })
  })
})

export { app }

if (EH_MAIN) {
  // Nunca deixar o processo morrer por erro não tratado (evita 503 cíclico).
  process.on('uncaughtException', (e) => console.error('[workbook] uncaughtException:', e))
  process.on('unhandledRejection', (e) => console.error('[workbook] unhandledRejection:', e))

  // Sobe já; se faltar build, dispara em background sem bloquear.
  ensureBuild()
  app.listen(PORT, HOST, () => {
    console.log(`[workbook] no ar em http://${HOST}:${PORT} (distOk=${!!resolveDist()})`)
  })
}
