/* ============================================================
   SERVIDOR DE PRODUÇÃO — Workbook CNHF
   ------------------------------------------------------------
   Serve o build (dist/) do Vite, faz o fallback de SPA e expõe
   POST /api/entrar — o LOGIN INTEIRO do aluno (login cru por e-mail,
   sem senha). Sem SUPABASE_SERVICE_ROLE_KEY configurada, ninguém entra
   no workbook: ver srvKey no /health.

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
    // srvKey:false => /api/entrar responde 503 => NINGUÉM consegue logar
    // no workbook (é o login inteiro, não um endpoint secundário). Causas
    // usuais: env não salva, nome diferente, ou app não reiniciado após salvar.
    srvKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    srvKeyLen: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').length,
  })
)

// ============================================================
// POST /api/entrar — LOGIN CRU por e-mail (decisão do Marcio, 2026-08-11)
// ------------------------------------------------------------
// O aluno deslogado informa SÓ o e-mail. Se o e-mail existe e não é de
// admin, o servidor emite um magic link (Admin API do GoTrue) e o front
// troca por sessão. Este é o LOGIN INTEIRO do sistema — não um endpoint
// secundário: sem ele, nenhum aluno entra.
//
// Propriedades de segurança OBRIGATÓRIAS deste endpoint:
//  1. ENUMERAÇÃO ACEITA DE PROPÓSITO: e-mail inexistente devolve 404
//     explícito (NAO_CADASTRADO), para o front oferecer a pesquisa a quem
//     ainda não é aluno. A defesa aqui não é resposta uniforme — é o
//     balde de rate limit `ip404` (item 3), que trava varredura de lista.
//  2. VERIFICAÇÃO DE ADMIN SEMPRE ANTES DO LINK: e-mail com role='admin'
//     em workbook.perfis nunca recebe magic link por este caminho (painel
//     admin expõe a base inteira de respostas). Ver
//     docs/sql/2026-08-11-acesso-por-email.sql.
//  3. RATE LIMIT por IP, por e-mail e por IP+404, com bloqueio progressivo.
//     LIMITAÇÃO CONHECIDA: o estado é EM MEMÓRIA — vale porque a
//     Hostinger roda UM processo; com N processos/instâncias cada um
//     teria contador próprio (multiplica o limite por N) e reiniciar o
//     processo zera os contadores. Se um dia houver cluster, mover para
//     Redis/tabela.
//  4. service_role SÓ AQUI, lida de env. Sem a env o endpoint responde
//     503 explícito (nunca "sempre nega" silencioso) e o boot loga alto.
//  5. AUDITORIA: toda tentativa vira uma linha [auditoria][entrar] no
//     stdout (e-mail, IP, resultado, motivo). (Follow-up: persistir em
//     tabela.)
// ============================================================

const SUPABASE_URL_SRV =
  (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://mbvybujpkwuorhtdzcde.supabase.co').replace(/\/+$/, '')

// domínio do próprio workbook (o action_link do GoTrue herda um redirect_to
// da config do projeto que aponta para OUTRO sistema — ver /api/entrar)
const BASE_URL_APP =
  (process.env.WORKBOOK_BASE_URL || 'https://workbook.cursoholding.com.br').replace(/\/+$/, '')
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SERVICE_ROLE_KEY) {
  console.error(
    '[workbook] ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY ausente — ' +
    'POST /api/entrar (o login inteiro) vai responder 503 até a env ser configurada.'
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

// ---------- rate limit em memória (ver LIMITAÇÃO no cabeçalho) ----------
const RL = {
  janelaMs: Number(process.env.RL_JANELA_MS) || 15 * 60_000,
  maxEmail: Number(process.env.RL_MAX_EMAIL) || 8,
  maxIp: Number(process.env.RL_MAX_IP) || 12,
  maxIp404: Number(process.env.RL_MAX_IP_404) || 5,
  bloqueioBaseMs: 15 * 60_000,
  bloqueioMaxMs: 4 * 3_600_000,
  maxChaves: 50_000, // teto duro de memória (~poucos MB)
  mapa: new Map(),   // chave → { hits: [ts], bloqueadoAte, violacoes }
}

/**
 * Registra um hit numa única chave/balde e devolve o timestamp até o qual
 * está bloqueado (0 = passa). Bloqueio progressivo: cada estouro dobra a
 * duração (15min → 30 → 60 → ... → 4h). Função de baixo nível — `limitar`
 * cobre o caso padrão (IP + e-mail); baldes extras (ex.: ip404) chamam
 * isto diretamente.
 */
function bater(chave, max) {
  const agora = Date.now()
  let r = RL.mapa.get(chave)
  if (!r) { r = { hits: [], bloqueadoAte: 0, violacoes: 0 }; RL.mapa.set(chave, r) }
  if (r.bloqueadoAte > agora) return r.bloqueadoAte
  r.hits = r.hits.filter((t) => agora - t < RL.janelaMs)
  r.hits.push(agora)
  if (r.hits.length > max) {
    r.violacoes += 1
    r.bloqueadoAte = agora + Math.min(RL.bloqueioBaseMs * 2 ** (r.violacoes - 1), RL.bloqueioMaxMs)
    r.hits = []
    return r.bloqueadoAte
  }
  return 0
}

/** Registra a tentativa nos baldes por IP e por e-mail; devolve o maior bloqueio. */
function limitar(ip, email) {
  const a = bater(`ip:${ip}`, RL.maxIp)
  const b = bater(`em:${email}`, RL.maxEmail)
  return Math.max(a, b)
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

/**
 * Plausibilidade de WhatsApp brasileiro (não é validação de existência).
 * Recebe só dígitos. Remove o prefixo 55 (DDI) quando presente e sobra
 * 10-11 dígitos; exige DDD real (11-99) e rejeita sequências de dígito
 * repetido (ex.: "0000000000"), que passam no teto de tamanho mas quebram
 * o casamento por últimos-8-dígitos nas RPCs de grupo.
 */
function telefonePlausivel(digitos) {
  let d = digitos
  if (d.length === 12 || d.length === 13) {
    if (d.startsWith('55') && (d.length - 2 === 10 || d.length - 2 === 11)) d = d.slice(2)
  }
  if (d.length !== 10 && d.length !== 11) return false
  const ddd = Number(d.slice(0, 2))
  if (ddd < 11 || ddd > 99) return false
  if (/^(\d)\1+$/.test(d)) return false
  return true
}

function auditar(evento) {
  // stdout = log da Node app na Hostinger. Follow-up: persistir em tabela.
  console.log('[auditoria][entrar]', JSON.stringify({ ts: new Date().toISOString(), ...evento }))
}

// ============================================================
// POST /api/entrar — LOGIN CRU por e-mail (decisão do Marcio, 2026-08-11)
// ------------------------------------------------------------
// O aluno digita SÓ o e-mail. Sem senha, sem WhatsApp, sem dados de
// pesquisa: quem prova posse do e-mail é o magic link, não este endpoint.
// Decisão de produto já tomada e reafirmada — não é para reabrir 2º fator.
//
// Exceção obrigatória: e-mail com role='admin' em workbook.perfis NÃO
// entra por login cru (medido em 2026-08-11: 8196 alunos, 1 admin) — o
// painel do admin expõe /resultado-das-pesquisas, as respostas de toda a
// base. A checagem de admin roda ANTES de qualquer emissão de link.
//
// E-mail inexistente devolve 404 explícito (NAO_CADASTRADO): a enumeração
// aqui é ACEITA de propósito, para o front oferecer a pesquisa a quem
// ainda não é aluno. Ver docs/sql/2026-08-11-acesso-por-email.sql para a
// RPC que resolve "existe"/"eh_admin" sem devolver mais nenhum dado.
// ============================================================
app.post('/api/entrar', express.json({ limit: '8kb' }), async (req, res) => {
  const ip = ipCliente(req)
  const email = String(req.body?.email || '').trim().toLowerCase()

  if (!admin) {
    auditar({ email, ip, resultado: 'config', motivo: 'SUPABASE_SERVICE_ROLE_KEY ausente' })
    return res.status(503).json({ ok: false, code: 'CONFIG', mensagem: 'Entrada indisponível no momento.' })
  }

  const bloqueadoAte = limitar(ip, email)
  if (bloqueadoAte) {
    const seg = Math.ceil((bloqueadoAte - Date.now()) / 1000)
    auditar({ email, ip, resultado: 'rate_limit', bloqueadoPorSeg: seg })
    return res.status(429).set('Retry-After', String(seg))
      .json({ ok: false, code: 'RATE_LIMIT', mensagem: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' })
  }

  if (!EMAIL_RE.test(email) || email.length > 254) {
    auditar({ email, ip, resultado: 'invalido' })
    return res.status(400).json({ ok: false, code: 'INVALID', mensagem: 'Digite um e-mail válido.' })
  }

  const { data, error: erroRpc } = await admin.rpc('acesso_por_email', { p_email: email })
  if (erroRpc) {
    // erro na consulta NUNCA vira "não cadastrado" — isso mascararia falha
    // de banco como se o aluno não existisse.
    auditar({ email, ip, resultado: 'erro', motivo: erroRpc.message })
    return res.status(500).json({ ok: false, code: 'ERRO', mensagem: 'Não foi possível verificar seu acesso agora. Tente de novo em instantes.' })
  }
  const linha = Array.isArray(data) ? data[0] : data

  if (!linha?.existe) {
    // balde extra: só incrementa em NAO_CADASTRADO — defesa contra
    // varredura de lista, já que a enumeração em si é aceita.
    const bloqueado404 = bater(`ip404:${ip}`, RL.maxIp404)
    if (bloqueado404) {
      const seg = Math.ceil((bloqueado404 - Date.now()) / 1000)
      auditar({ email, ip, resultado: 'rate_limit', bloqueadoPorSeg: seg, motivo: 'varredura_404' })
      return res.status(429).set('Retry-After', String(seg))
        .json({ ok: false, code: 'RATE_LIMIT', mensagem: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' })
    }
    auditar({ email, ip, resultado: 'nao_cadastrado' })
    return res.status(404).json({ ok: false, code: 'NAO_CADASTRADO', mensagem: 'Não encontramos um cadastro com esse e-mail.' })
  }

  if (linha.eh_admin) {
    // checagem de admin SEMPRE antes de emitir link — não emite magic link nenhum
    auditar({ email, ip, resultado: 'admin_recusado' })
    return res.status(403).json({ ok: false, code: 'ADMIN_PRECISA_SENHA', mensagem: 'Contas de administrador entram com senha, não pelo login por e-mail.' })
  }

  const { data: linkData, error: erroLink } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${BASE_URL_APP}/` },
  })
  const hashed = linkData?.properties?.hashed_token || ''
  if (erroLink || !hashed) {
    auditar({ email, ip, resultado: 'erro', motivo: erroLink?.message || 'sem hashed_token' })
    return res.status(500).json({ ok: false, code: 'ERRO', mensagem: 'Não foi possível gerar seu acesso agora. Tente de novo em instantes.' })
  }

  auditar({ email, ip, resultado: 'sucesso' })
  // `token_hash`: o front troca por sessão com verifyOtp, sem navegar
  return res.status(200).json({ ok: true, token_hash: hashed })
})

// ============================================================
// GET /api/grupo · POST /api/grupo/telefone — CTA do grupo de WhatsApp
// ------------------------------------------------------------
// Na home do aluno logado, mostra um link de convite (Sendflow) para o
// grupo de WhatsApp do SEGMENTO dele (Advocacia/Contabilidade/Outra) — mas
// SÓ para quem ainda não está no grupo. Evitar gente duplicada nos grupos
// é requisito explícito do dono do produto: por isso o servidor nunca
// devolve o link para quem a consulta identifica como já-membro, mesmo em
// caminho de erro (fail-closed — na dúvida, não mostra CTA).
//
// Os 3 links do Sendflow são hardcoded AQUI, nunca em src/: se fossem dado
// de cliente (Vite injeta tudo em src/ no bundle), qualquer visitante veria
// os 3 convites sem estar logado nem ter feito a pesquisa.
//
// Propriedades de segurança:
//  1. E-MAIL NUNCA VEM DO CLIENTE. Extraído do Authorization: Bearer
//     <access_token> via admin.auth.getUser(token) — senão o endpoint vira
//     "descubra se fulano@x.com está no grupo de WhatsApp dele", o mesmo
//     formato de vazamento já documentado em
//     docs/audits/2026-07-27-rls-critico.md. Sem token válido → 401.
//  2. RPCs (docs/sql/2026-08-11-cta-grupo.sql) são security definer com
//     EXECUTE restrito a service_role — leem controle.vw_lead_grupo_status,
//     schema de OUTRO sistema.
//  3. RATE LIMIT no envio de telefone usa AMBOS os baldes: por IP (limitar,
//     igual /api/entrar) e por e-mail (3 tentativas / 15 min) — só por
//     e-mail não bastava, porque o e-mail é fixo pelo token e um aluno
//     autenticado poderia varrer telefones de terceiros usando o próprio
//     e-mail como chave (ver comentário no handler).
//  4. AUDITORIA em toda tentativa, evento:'grupo', resultado distinto por
//     desfecho — mesmo padrão do /api/entrar.
// ============================================================

/**
 * Resolve o e-mail da sessão a partir do header Authorization. Devolve
 * null se ausente/inválido — NUNCA lê e-mail de body/query (ver cabeçalho).
 */
async function emailDaSessao(req) {
  const auth = String(req.headers['authorization'] || '')
  const m = /^Bearer\s+(.+)$/i.exec(auth)
  if (!m) return null
  const { data, error } = await admin.auth.getUser(m[1])
  if (error || !data?.user?.email) return null
  return data.user.email.toLowerCase()
}

// Links oficiais do Sendflow por segmento — NUNCA mover para src/.
const LINKS_GRUPO = {
  Advocacia: 'https://sndflw.com/i/izSQAE8NGzHHMEO1MLUD',
  Contabilidade: 'https://sndflw.com/i/ABZK6WEEczgaCy8gXnsJ',
  Outra: 'https://sndflw.com/i/oXbYuz4D6XmhRpor0f6Q',
}
const linkDoSegmento = (area) => LINKS_GRUPO[area] || LINKS_GRUPO.Outra // area nula/desconhecida = grupo coringa

app.get('/api/grupo', async (req, res) => {
  const ip = ipCliente(req)

  if (!admin) {
    auditar({ evento: 'grupo', ip, resultado: 'config', motivo: 'SUPABASE_SERVICE_ROLE_KEY ausente' })
    return res.status(503).json({ ok: false, code: 'CONFIG', mensagem: 'Indisponível no momento.' })
  }

  const email = await emailDaSessao(req)
  if (!email) {
    auditar({ evento: 'grupo', ip, resultado: 'nao_autenticado' })
    return res.status(401).json({ ok: false, code: 'NAO_AUTENTICADO', mensagem: 'Sessão inválida ou expirada.' })
  }

  const { data, error: erroRpc } = await admin.rpc('status_grupo_por_email', { p_email: email })
  if (erroRpc) {
    auditar({ evento: 'grupo', email, ip, resultado: 'erro', motivo: erroRpc.message })
    // fail-closed: nunca mostrar:true com link por engano num erro
    return res.status(500).json({ ok: false, code: 'ERRO', mensagem: 'Não foi possível verificar o grupo agora.' })
  }
  const linha = Array.isArray(data) ? data[0] : data

  if (linha?.no_grupo) {
    auditar({ evento: 'grupo', email, ip, resultado: 'ja_no_grupo' })
    return res.status(200).json({ ok: true, mostrar: false, area: linha.area ?? null, link: null, precisaTelefone: false })
  }

  if (!linha?.tem_telefone) {
    auditar({ evento: 'grupo', email, ip, resultado: 'pediu_telefone' })
    return res.status(200).json({ ok: true, mostrar: true, area: linha?.area ?? null, link: null, precisaTelefone: true })
  }

  auditar({ evento: 'grupo', email, ip, resultado: 'mostrou' })
  return res.status(200).json({ ok: true, mostrar: true, area: linha.area ?? null, link: linkDoSegmento(linha.area), precisaTelefone: false })
})

app.post('/api/grupo/telefone', express.json({ limit: '4kb' }), async (req, res) => {
  const ip = ipCliente(req)

  if (!admin) {
    auditar({ evento: 'grupo', ip, resultado: 'config', motivo: 'SUPABASE_SERVICE_ROLE_KEY ausente' })
    return res.status(503).json({ ok: false, code: 'CONFIG', mensagem: 'Indisponível no momento.' })
  }

  const email = await emailDaSessao(req)
  if (!email) {
    auditar({ evento: 'grupo', ip, resultado: 'nao_autenticado' })
    return res.status(401).json({ ok: false, code: 'NAO_AUTENTICADO', mensagem: 'Sessão inválida ou expirada.' })
  }

  // Este endpoint aceita um telefone ARBITRÁRIO no body — sem o rate limit
  // por IP, um aluno autenticado (e-mail fixo pelo token) poderia varrer
  // números de TERCEIROS e descobrir, pela resposta, quem está no grupo de
  // WhatsApp (o mesmo oráculo que o comentário da RPC diz querer evitar).
  // Por isso: balde por IP (limitar, igual /api/entrar) SOMADO ao balde
  // próprio por e-mail, agora com teto baixo (3/15min) — o caso legítimo é
  // "digitei meu WhatsApp, errei uma vez, corrigi", não uma sequência longa.
  const bloqueadoAte = Math.max(limitar(ip, email), bater(`grupo_tel:${email}`, 3))
  if (bloqueadoAte) {
    const seg = Math.ceil((bloqueadoAte - Date.now()) / 1000)
    auditar({ evento: 'grupo', email, ip, resultado: 'rate_limit', bloqueadoPorSeg: seg })
    return res.status(429).set('Retry-After', String(seg))
      .json({ ok: false, code: 'RATE_LIMIT', mensagem: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' })
  }

  const telefoneDigitos = String(req.body?.telefone || '').replace(/\D/g, '')
  if (!telefonePlausivel(telefoneDigitos)) {
    auditar({ evento: 'grupo', email, ip, resultado: 'erro', motivo: 'telefone_invalido' })
    return res.status(400).json({ ok: false, code: 'INVALID', mensagem: 'Digite um WhatsApp válido, com DDD.' })
  }

  const { data, error: erroRpc } = await admin.rpc('status_grupo_por_telefone', { p_email: email, p_telefone: telefoneDigitos })
  if (erroRpc) {
    auditar({ evento: 'grupo', email, ip, resultado: 'erro', motivo: erroRpc.message })
    return res.status(500).json({ ok: false, code: 'ERRO', mensagem: 'Não foi possível verificar o grupo agora.' })
  }
  const linha = Array.isArray(data) ? data[0] : data

  // uma linha de auditoria por request (padrão do /api/entrar): a RPC já
  // grava o telefone (se estava vazio) como efeito colateral do mesmo
  // caminho, então o resultado registrado é o desfecho do CTA, não a
  // gravação em si — 'telefone_gravado' cobre ambos os ramos abaixo.
  if (linha?.no_grupo) {
    auditar({ evento: 'grupo', email, ip, resultado: 'telefone_gravado', desfecho: 'ja_no_grupo' })
    return res.status(200).json({ ok: true, mostrar: false, jaEstava: true })
  }

  auditar({ evento: 'grupo', email, ip, resultado: 'telefone_gravado', desfecho: 'mostrou' })
  return res.status(200).json({ ok: true, mostrar: true, link: linkDoSegmento(linha?.area) })
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
