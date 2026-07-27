/* ============================================================
   SERVICE WORKER DO WORKBOOK — offline-first do app shell
   ------------------------------------------------------------
   Escrito à mão (sem plugin) porque o app usa `base: './'` e
   roteamento por hash: um único shell (index.html) atende todas
   as rotas, e os assets do build têm hash no nome (imutáveis).

   Estratégias:
   - navegação (mode: navigate)  → network-first com timeout de 4s,
     fallback pro shell em cache (aula continua com wi-fi caindo)
   - ./assets/* e ./fonts/*      → cache-first (nomes com hash =
     imutáveis; versões antigas coexistem, poda por tamanho)
   - estáticos do shell          → stale-while-revalidate
   - Supabase                    → NUNCA interceptado (nem GET). Ver a
     justificativa de segurança no handler de fetch: cachear leitura
     que alimenta read-merge-write destrói respostas do aluno, e a
     leitura do admin traz a base inteira de leads.

   Atualização: skipWaiting + clients.claim SEM recarregar a página.
   A página aberta segue na versão dela (os chunks antigos ficam no
   cache de assets, que não é apagado na ativação — só podado por
   tamanho), então ninguém perde texto digitado por reload forçado.
   Como a navegação é network-first, qualquer recarga com rede pega
   o shell novo → o aluno também nunca fica preso numa versão velha.
   ============================================================ */

const PREFIXO = 'wbcnhf'
const CACHE_SHELL = `${PREFIXO}-shell-v1`
const CACHE_ASSETS = `${PREFIXO}-assets-v1`
// CACHE_API foi REMOVIDO da lista de caches atuais de propósito: versões
// anteriores deste SW gravaram respostas do PostgREST (PII de leads e respostas
// de alunos) em `wbcnhf-api-v1`. Ficando fora de CACHES_ATUAIS, o handler de
// activate abaixo o apaga no próximo deploy, limpando quem já está em campo.
const CACHES_ATUAIS = [CACHE_SHELL, CACHE_ASSETS]

// base relativa ao escopo do SW (app servido com base './')
const BASE = self.registration.scope
const SHELL_URLS = ['./', './index.html', './manifest.webmanifest', './favicon.svg', './logo-cnhf.png']
  .map((p) => new URL(p, BASE).href)
const SHELL_FALLBACK = new URL('./index.html', BASE).href

const MAX_ASSETS = 100        // poda do cache de assets (hash = imutável)
const TIMEOUT_NAV_MS = 4000   // wi-fi de auditório: não deixar a navegação pendurada

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_SHELL)
    await cache.addAll(SHELL_URLS)
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // remove só caches de versões anteriores DESTE SW (prefixo nosso)
    const nomes = await caches.keys()
    await Promise.all(nomes
      .filter((n) => n.startsWith(PREFIXO) && !CACHES_ATUAIS.includes(n))
      .map((n) => caches.delete(n)))
    await self.clients.claim()
  })())
})

// purga sob demanda: a página pede no logout. Feito aqui (e não só na página)
// porque o SW ativo pode ser de outra versão que ainda tenha caches de PII.
self.addEventListener('message', (e) => {
  if (e.data?.tipo !== 'purgar-sessao') return
  e.waitUntil((async () => {
    const nomes = await caches.keys()
    await Promise.all(nomes.filter((n) => n.startsWith(PREFIXO) && n !== CACHE_ASSETS)
      .map((n) => caches.delete(n)))
    e.source?.postMessage?.({ tipo: 'purgado' })
  })())
})

// fetch com timeout — rede lenta não pode segurar a página
function fetchComTimeout(req, ms) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error('timeout')), ms)
    fetch(req).then((r) => { clearTimeout(timer); res(r) }, (e) => { clearTimeout(timer); rej(e) })
  })
}

/**
 * Chave de cache sem credenciais. A Cache API guarda o Request INTEIRO como
 * chave, headers inclusive — ou seja, `cache.put(req, …)` grava o
 * `Authorization: Bearer <JWT>` do aluno em disco. Reconstruir a chave a partir
 * só da URL mantém o cache funcionando e tira o token do armazenamento.
 */
function chaveSemCredenciais(req) {
  return new Request(req.url, { method: 'GET' })
}

/** resposta redirecionada não pode ir para o cache: devolvê-la a partir de um
 *  respondWith de navegação lança TypeError e quebra justamente o modo offline. */
function cacheavel(resp) {
  return resp && resp.ok && !resp.redirected
}

async function networkFirst(req, cacheName, { fallback = null, timeout = 0 } = {}) {
  const cache = await caches.open(cacheName)
  const chave = chaveSemCredenciais(req)
  try {
    const resp = timeout ? await fetchComTimeout(req, timeout) : await fetch(req)
    if (cacheavel(resp)) cache.put(chave, resp.clone())
    return resp
  } catch (err) {
    const hit = await cache.match(chave, { ignoreSearch: false })
    if (hit) return hit
    if (fallback) {
      const fb = await cache.match(fallback)
      if (fb) return fb
    }
    throw err
  }
}

async function cacheFirst(req, cacheName, cap) {
  const cache = await caches.open(cacheName)
  const chave = chaveSemCredenciais(req)
  const hit = await cache.match(chave)
  if (hit) return hit
  const resp = await fetch(req)
  if (cacheavel(resp)) {
    await cache.put(chave, resp.clone())
    if (cap) podar(cache, cap)   // sem await: poda em segundo plano
  }
  return resp
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName)
  const chave = chaveSemCredenciais(req)
  const hit = await cache.match(chave)
  const rede = fetch(req)
    .then((resp) => { if (cacheavel(resp)) cache.put(chave, resp.clone()); return resp })
    .catch(() => null)
  return hit || rede.then((r) => r || Promise.reject(new Error('offline sem cache')))
}

async function podar(cache, cap) {
  try {
    const chaves = await cache.keys()
    // FIFO simples: as entradas mais antigas (versões velhas do build) saem primeiro
    for (let i = 0; i < chaves.length - cap; i++) await cache.delete(chaves[i])
  } catch { /* poda é melhor esforço */ }
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)

  // Supabase: NADA é interceptado. Decisão de segurança, não de performance:
  //
  //  1. `getWorkbook()` alimenta um read-merge-write. Servir essa leitura do
  //     cache faz `saveWorkbook` mesclar sobre um snapshot velho e APAGAR do
  //     banco campos que existem — silenciosamente, exibindo "salvo". Isso
  //     anulava a invariante "se a leitura falhar, não grava" do api.js.
  //  2. `getAllResults()` (admin) devolve a base inteira de leads; cacheá-la
  //     deixava nome, e-mail e respostas em claro no disco da máquina do admin,
  //     sem expiração — retenção sem base legal.
  //
  // A leitura offline do workbook já vem do IndexedDB no store.init(), então o
  // cache aqui era redundante e só agregava risco.
  if (url.hostname.endsWith('.supabase.co')) return

  if (url.origin !== self.location.origin || req.method !== 'GET') return

  // navegação → network-first com timeout + fallback pro shell
  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, CACHE_SHELL, { fallback: SHELL_FALLBACK, timeout: TIMEOUT_NAV_MS }))
    return
  }

  // assets com hash do build + fontes → cache-first (imutáveis).
  // startsWith no escopo, não includes: `includes('/assets/')` casaria com
  // qualquer path que contivesse o trecho em qualquer posição.
  const base = new URL('./', self.registration.scope).pathname
  if (url.pathname.startsWith(base + 'assets/') || url.pathname.startsWith(base + 'fonts/')) {
    e.respondWith(cacheFirst(req, CACHE_ASSETS, MAX_ASSETS))
    return
  }

  // demais estáticos same-origin (favicon, logo, manifest)
  e.respondWith(staleWhileRevalidate(req, CACHE_SHELL))
})
