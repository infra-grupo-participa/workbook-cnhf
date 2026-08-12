/* ============================================================
   STORE LOCAL-FIRST DO WORKBOOK — CONTRATO 2
   ------------------------------------------------------------
   Fonte primária de escrita: IndexedDB (cada tecla grava local
   IMEDIATAMENTE, sem debounce). O sync remoto é agendado em
   segundo plano, com merge POR CAMPO por timestamp — nunca
   sobrescreve o mapa inteiro (mata o bug de duas abas).

   Formato de cada campo (local e no jsonb remoto):
     { v: 'texto digitado', t: 1753500000000 }   // t = epoch ms
   Legado remoto (string crua "1.116") é lido como { v, t: 0 },
   então QUALQUER edição local (t > 0) vence o dado antigo.

   API (consumida por Workbook.vue — ver CONTRATO 2 no scratchpad):
     await store.init()
     store.valores        reactive<Record<string,string>> (v-model ok)
     store.get(id) / store.set(id, valor)
     store.status         ref<'salvo'|'salvando'|'offline'|'erro'>
     store.ultimaSync     ref<Date|null>
     store.pendentes      ref<number>
     await store.flush()
     store.progresso      reactive<{ preenchidas, ultima_secao, onboarding_visto }>
     store.marcarOnboardingVisto()   // idempotente; persiste no próximo sync

   Observação de arquitetura: o push remoto envia SEMPRE o mapa
   local completo (não só os campos sujos). Combinado com o merge
   por campo no servidor (api.js lê → merge → grava), isso torna o
   sistema auto-curativo: mesmo que uma escrita concorrente "vença"
   uma janela de corrida, o próximo sync de qualquer aba/dispositivo
   reapresenta os campos com seus timestamps e o maior t vence.
   ============================================================ */

import { reactive, ref, watch } from 'vue'

// --- constantes de sincronização ---
export const SYNC_DEBOUNCE_MS = 800     // espera após a última tecla
export const SYNC_MAX_WAIT_MS = 5000    // digitação contínua: sync no máx. a cada 5s
const BACKOFF_BASE_MS = 1000            // 1s, 2s, 4s, 8s…
const BACKOFF_MAX_MS = 30000            // …teto de 30s
const NOME_DB = 'workbook-cnhf'

// ============================================================
// Funções puras (também usadas por api.js e pelos testes)
// ============================================================

/** teto de tolerância para relógio adiantado. Sem isso, um `t` no futuro
 *  (relógio errado do dispositivo) PINA o campo para sempre: o merge é `>`
 *  estrito, então nem o próprio aluno, de outro aparelho com hora correta,
 *  consegue sobrescrever. Estado irrecuperável pelo produto. */
const SKEW_MAX_MS = 5 * 60 * 1000

/** normaliza um valor do jsonb para o envelope { v, t }.
 *  string crua = formato legado → t: 0 (perde para qualquer edição local). */
export function normalizarCampo(val, agora = Date.now()) {
  const teto = agora + SKEW_MAX_MS
  if (typeof val === 'string') return { v: val, t: 0 }
  if (val && typeof val === 'object' && 'v' in val) {
    return { v: String(val.v ?? ''), t: Math.min(Number(val.t) || 0, teto) }
  }
  return null
}

/** normaliza um mapa inteiro de respostas (legado ou novo) para { id: {v,t} } */
export function normalizarRespostas(mapa) {
  const out = {}
  for (const [id, val] of Object.entries(mapa || {})) {
    const c = normalizarCampo(val)
    if (c) out[id] = c
  }
  return out
}

/** merge por campo: `patch[id]` vence `base[id]` apenas se t estritamente
 *  maior (ou se o campo não existe na base). Campos exclusivos de cada
 *  lado sempre sobrevivem. Nunca substitui o mapa inteiro. */
export function mergeRespostas(base, patch) {
  const out = { ...base }
  for (const [id, cp] of Object.entries(patch || {})) {
    const cb = out[id]
    if (!cb || (cp.t ?? 0) > (cb.t ?? 0)) out[id] = cp
  }
  return out
}

/** nº de campos com resposta não vazia */
export function contarPreenchidas(mapa) {
  let n = 0
  for (const c of Object.values(mapa || {})) {
    if (((c && typeof c === 'object' ? c.v : c) || '').trim().length > 0) n++
  }
  return n
}

/** aplica um save no "row" remoto: lê o estado atual, faz merge por campo
 *  e devolve o registro final. É a ÚNICA lógica de escrita — api.js usa
 *  esta função e os testes usam a mesma, garantindo paridade.
 *
 *  `progresso` é reconstruído por CIMA do que já existia na linha (spread de
 *  `rowAtual.progresso` primeiro) — nunca do zero. Reconstruir do zero apaga
 *  em silêncio qualquer chave que não seja `preenchidas`/`ultima_secao`
 *  (ex.: `onboarding_visto`) no próximo save de lacuna. */
export function aplicarSaveNoRow(rowAtual, respostasPatch, progresso) {
  const base = normalizarRespostas(rowAtual?.respostas)
  const merged = mergeRespostas(base, normalizarRespostas(respostasPatch))
  return {
    respostas: merged,
    progresso: {
      ...(rowAtual?.progresso || {}),
      ...(progresso || {}),
      preenchidas: contarPreenchidas(merged),
      ultima_secao:
        progresso?.ultima_secao ?? rowAtual?.progresso?.ultima_secao ?? null,
      // one-way: uma vez true, nunca regride pra false. Sem isso, um init()
      // que não leu o remoto a tempo (partida offline, o cenário-alvo durante
      // a aula) parte de `onboarding_visto:false` local e o próximo save de
      // lacuna apagava o `true` remoto por cima — o modal reabria pro aluno
      // que já tinha visto.
      onboarding_visto:
        progresso?.onboarding_visto === true ||
        rowAtual?.progresso?.onboarding_visto === true,
    },
  }
}

// ============================================================
// Adaptadores de storage (IndexedDB real + memória p/ fallback e testes)
// ============================================================
// Interface: carregarTudo(uid) → { campos: {id:{v,t,dirty}}, meta }
//            gravarCampo(uid, id, reg) / gravarMeta(uid, meta)
// Chaves em `campos` são `${uid}|${id}` — cada campo é um registro
// próprio no IndexedDB, então duas abas nunca sobrescrevem o mapa
// uma da outra nem localmente.

export function criarStorageMemoria() {
  const campos = new Map()
  const metas = new Map()
  return {
    async carregarTudo(uid) {
      const out = {}
      for (const [k, v] of campos) {
        if (k.startsWith(uid + '|')) out[k.slice(uid.length + 1)] = { ...v }
      }
      return { campos: out, meta: metas.get(uid) || null }
    },
    async gravarCampo(uid, id, reg) { campos.set(`${uid}|${id}`, { ...reg }) },
    async gravarMeta(uid, meta) { metas.set(uid, { ...meta }) },
  }
}

function criarStorageIndexedDB() {
  let dbp = null
  function abrir() {
    if (dbp) return dbp
    dbp = new Promise((res, rej) => {
      const req = indexedDB.open(NOME_DB, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('campos')) db.createObjectStore('campos')
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
      }
      req.onsuccess = () => res(req.result)
      req.onerror = () => rej(req.error)
      req.onblocked = () => rej(new Error('indexeddb bloqueado'))
    })
    return dbp
  }
  function pedir(req) {
    return new Promise((res, rej) => {
      req.onsuccess = () => res(req.result)
      req.onerror = () => rej(req.error)
    })
  }
  return {
    async carregarTudo(uid) {
      const db = await abrir()
      const tx = db.transaction(['campos', 'meta'], 'readonly')
      const faixa = IDBKeyRange.bound(uid + '|', uid + '|￿')
      const [regs, chaves, meta] = await Promise.all([
        pedir(tx.objectStore('campos').getAll(faixa)),
        pedir(tx.objectStore('campos').getAllKeys(faixa)),
        pedir(tx.objectStore('meta').get(uid)),
      ])
      const campos = {}
      chaves.forEach((k, i) => { campos[String(k).slice(uid.length + 1)] = regs[i] })
      return { campos, meta: meta || null }
    },
    async gravarCampo(uid, id, reg) {
      const db = await abrir()
      const tx = db.transaction('campos', 'readwrite')
      tx.objectStore('campos').put({ v: reg.v, t: reg.t, dirty: reg.dirty ? 1 : 0 }, `${uid}|${id}`)
      return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error) })
    },
    async gravarMeta(uid, meta) {
      const db = await abrir()
      const tx = db.transaction('meta', 'readwrite')
      tx.objectStore('meta').put(meta, uid)
      return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error) })
    },
  }
}

// ============================================================
// Fábrica do store (deps injetáveis p/ teste; singleton no fim)
// ============================================================

export function criarStore(deps = {}) {
  // --- estado reativo exposto (CONTRATO 2) ---
  const valores = reactive({})                      // { id: 'texto' } — bind direto
  const status = ref('salvo')                       // 'salvo'|'salvando'|'offline'|'erro'
  const ultimaSync = ref(null)                      // Date|null
  const pendentes = ref(0)                          // nº de campos ainda não sincronizados
  const progresso = reactive({ preenchidas: 0, ultima_secao: null, onboarding_visto: false })

  // --- estado interno ---
  let campos = {}                                   // { id: { v, t, dirty } } — verdade local
  let uid = 'anon'
  let api = deps.api || null                        // injetável nos testes
  let storage = deps.storage || null
  const now = deps.now || (() => Date.now())
  const onLine = deps.onLine ||
    (() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false))

  let timerDebounce = null
  let timerMaxWait = null
  let timerRetry = null
  let tentativas = 0                                // p/ backoff exponencial
  let promessaSync = null                           // sync em voo
  let precisaResync = false                         // set() chegou durante o voo
  let iniciado = false
  let listeners = []                                // { alvo, evento, fn } p/ poder remover no reset()

  function contarPendentes() {
    pendentes.value = Object.values(campos).filter((c) => c.dirty).length
  }
  function payloadCompleto() {
    const out = {}
    for (const [id, c] of Object.entries(campos)) out[id] = { v: c.v, t: c.t }
    return out
  }
  function progressoAtual() {
    return {
      preenchidas: progresso.preenchidas,
      ultima_secao: progresso.ultima_secao,
      onboarding_visto: progresso.onboarding_visto,
    }
  }

  /**
   * reset — devolve o store ao estado zero. OBRIGATÓRIO na troca de identidade:
   * sem isso, o singleton de módulo sobrevive ao logout e as respostas do aluno
   * anterior aparecem na tela do próximo E são gravadas na linha dele.
   */
  function reset() {
    cancelarTimers()
    cancelarRetry()
    for (const { alvo, evento, fn } of listeners) {
      try { alvo.removeEventListener(evento, fn) } catch { /* ambiente sem DOM */ }
    }
    listeners = []
    campos = {}
    uid = 'anon'
    iniciado = false
    tentativas = 0
    promessaSync = null
    precisaResync = false
    for (const k of Object.keys(valores)) delete valores[k]   // muta o reactive
    progresso.preenchidas = 0
    progresso.ultima_secao = null
    progresso.onboarding_visto = false
    pendentes.value = 0
    ultimaSync.value = null
    status.value = 'salvo'
  }

  // ---------- init: IndexedDB → remoto → merge por campo ----------
  async function init() {
    if (!api) api = await import('./api.js')        // lazy: evita ciclo e permite testes em Node
    // Guarda por IDENTIDADE, não por "já rodou": se o uid mudou (troca de conta
    // na mesma aba), zera tudo antes de carregar os dados do novo aluno.
    const novoUid = (api.currentUserId && api.currentUserId()) || 'anon'
    if (iniciado && novoUid === uid) return
    if (iniciado && novoUid !== uid) reset()
    iniciado = true
    if (!storage) {
      try {
        if (typeof indexedDB === 'undefined') throw new Error('sem indexedDB')
        storage = criarStorageIndexedDB()
      } catch { storage = criarStorageMemoria() }   // degrada p/ memória (sem durabilidade)
    }
    uid = (api.currentUserId && api.currentUserId()) || 'anon'

    // 1. local primeiro (funciona offline)
    let local = { campos: {}, meta: null }
    try { local = await storage.carregarTudo(uid) } catch { /* segue sem local */ }
    const antesDoInit = campos                       // set() que chegou antes do init
    campos = local.campos || {}
    for (const [id, c] of Object.entries(antesDoInit)) {
      if (!campos[id] || c.t > campos[id].t) {
        campos[id] = c
        storage.gravarCampo(uid, id, c).catch(() => {})
      }
    }
    if (local.meta) {
      progresso.ultima_secao = local.meta.ultima_secao ?? null
      // one-way: a meta local só é escrita quando `true` (ver
      // marcarOnboardingVisto), então sua mera presença já confirma "visto"
      // mesmo sem rede — é o que falta pro beacon não regredir a flag offline.
      if (local.meta.onboarding_visto === true) progresso.onboarding_visto = true
    }

    // 2. remoto + merge por campo (maior t vence; legado t=0 nunca vence local)
    let remoto = null
    try { remoto = await api.getWorkbook() } catch { /* offline: fica no local */ }
    if (remoto && remoto.ok !== false) {
      for (const [id, cr] of Object.entries(remoto.respostas || {})) {
        const cl = campos[id]
        if (!cl || cr.t > cl.t) {
          campos[id] = { v: cr.v, t: cr.t, dirty: 0 }
          storage.gravarCampo(uid, id, campos[id]).catch(() => {})
        }
      }
      if (!progresso.ultima_secao && remoto.progresso?.ultima_secao) {
        progresso.ultima_secao = remoto.progresso.ultima_secao
      }
      // one-way: ausente (linha antiga, inclusive os 341 alunos de 11/08) = nunca
      // viu; mas se o remoto já disser true, local nunca regride pra false.
      progresso.onboarding_visto =
        progresso.onboarding_visto === true || remoto.progresso?.onboarding_visto === true
    }
    // se a leitura do remoto falhou (offline — o cenário-alvo durante a aula), o
    // bloco acima nem roda; mas a meta local (passo 1) já cobre esse caso: uma
    // vez visto, fica gravado no IndexedDB, então `progresso.onboarding_visto`
    // segue `true` mesmo sem rede, e o beacon nunca reporta `false` por engano.

    // 3. espelha no estado reativo
    for (const [id, c] of Object.entries(campos)) valores[id] = c.v
    progresso.preenchidas = contarPreenchidas(campos)
    contarPendentes()
    status.value = onLine() ? 'salvo' : 'offline'
    if (pendentes.value > 0) agendarSync()          // sobras de sessão anterior → drena

    // 4. listeners de ambiente (só no browser)
    if (typeof window !== 'undefined' && !deps.semListeners) {
      // registrados via `ouvir` para que reset() consiga removê-los — antes
      // vazavam um conjunto novo a cada init()
      const ouvir = (alvo, evento, fn) => {
        alvo.addEventListener(evento, fn)
        listeners.push({ alvo, evento, fn })
      }
      ouvir(window, 'online', () => {
        tentativas = 0
        if (pendentes.value > 0) executarSync()
        else status.value = 'salvo'
      })
      ouvir(window, 'offline', () => { status.value = 'offline' })
      // último recurso ao fechar a aba: fetch keepalive (não dá para await aqui).
      // Limitação documentada: o beacon grava sem read-merge prévio, mas o
      // payload é o mapa local completo com timestamps — o merge por campo do
      // próximo sync de qualquer outra aba corrige qualquer corrida.
      const beacon = () => {
        if (pendentes.value === 0) return
        // trava de identidade: nunca disparar o mapa de um uid na sessão de outro
        if (!api.currentUserId || api.currentUserId() !== uid) return
        try { api.saveWorkbookBeacon?.(payloadCompleto(), progressoAtual()) } catch { /* melhor esforço */ }
      }
      ouvir(window, 'pagehide', beacon)
      ouvir(window, 'beforeunload', beacon)
    }
  }

  // ---------- escrita local imediata ----------
  function set(id, valor) {
    const v = String(valor ?? '')
    const c = campos[id]
    if (c && c.v === v) return                      // nada mudou
    campos[id] = { v, t: now(), dirty: 1 }
    valores[id] = v
    progresso.preenchidas = contarPreenchidas(campos)
    if (storage) storage.gravarCampo(uid, id, campos[id]).catch(() => {})
    contarPendentes()
    cancelarRetry()                                 // novo set cancela retry pendente (backoff mantém a contagem)
    status.value = onLine() ? 'salvando' : 'offline'
    agendarSync()
  }

  function get(id) { return campos[id]?.v ?? '' }

  // v-model direto em store.valores também persiste: o watcher detecta a
  // diferença em relação a `campos` e roteia pela mesma trilha do set().
  watch(valores, () => {
    for (const [id, v] of Object.entries(valores)) {
      if ((campos[id]?.v ?? '') !== (v ?? '')) set(id, v)
    }
  }, { deep: true })

  // `gravarMeta` faz put() do objeto inteiro (sem merge) — sempre grava os dois
  // campos juntos pra um watch não apagar o que o outro acabou de persistir.
  function persistirMetaLocal() {
    if (!storage) return
    storage.gravarMeta(uid, {
      ultima_secao: progresso.ultima_secao,
      onboarding_visto: progresso.onboarding_visto === true,
      t: now(),
    }).catch(() => {})
  }

  // troca de seção → persiste meta local e agenda sync leve
  watch(() => progresso.ultima_secao, () => {
    if (!iniciado || !storage) return
    persistirMetaLocal()
    agendarSync()
  })

  // onboarding visto → persiste meta local (defesa contra regressão offline,
  // ver init()) e agenda sync (mesmo padrão do watch de ultima_secao acima)
  watch(() => progresso.onboarding_visto, (v) => {
    if (!iniciado || !v) return
    persistirMetaLocal()
    agendarSync()
  })

  /** marca o modal de onboarding como visto e agenda a persistência (mesma
   *  trilha de sync do resto do store — debounce + retry + beacon). Chamar
   *  ao fechar o modal no primeiro login. */
  function marcarOnboardingVisto() {
    if (progresso.onboarding_visto) return
    progresso.onboarding_visto = true
  }

  // ---------- agendamento ----------
  function agendarSync() {
    if (timerDebounce) clearTimeout(timerDebounce)
    timerDebounce = setTimeout(executarSync, SYNC_DEBOUNCE_MS)
    if (!timerMaxWait) {
      timerMaxWait = setTimeout(() => { timerMaxWait = null; executarSync() }, SYNC_MAX_WAIT_MS)
    }
  }
  function cancelarTimers() {
    if (timerDebounce) { clearTimeout(timerDebounce); timerDebounce = null }
    if (timerMaxWait) { clearTimeout(timerMaxWait); timerMaxWait = null }
  }
  function cancelarRetry() {
    if (timerRetry) { clearTimeout(timerRetry); timerRetry = null }
  }
  function agendarRetry() {
    cancelarRetry()
    const base = Math.min(BACKOFF_BASE_MS * 2 ** tentativas, BACKOFF_MAX_MS)
    tentativas++
    const espera = Math.round(base * (0.8 + Math.random() * 0.4))  // jitter ±20%
    timerRetry = setTimeout(executarSync, espera)
  }

  // ---------- sync remoto ----------
  function executarSync() {
    cancelarTimers()
    if (promessaSync) { precisaResync = true; return promessaSync }
    promessaSync = (async () => {
      try {
        if (!onLine()) { status.value = 'offline'; agendarRetry(); return }
        const uidAtual = api.currentUserId && api.currentUserId()
        if (!uidAtual) { status.value = 'erro'; agendarRetry(); return }
        // Trava de segurança independente da guarda do init(): se a sessão trocou
        // por baixo, abortar. Gravar aqui escreveria o mapa deste uid na linha do
        // outro aluno e, pelo merge por timestamp, destruiria as respostas dele.
        if (uidAtual !== uid) { cancelarRetry(); return }
        status.value = 'salvando'
        // t de cada campo sujo no momento do push — se o aluno digitar durante
        // o voo, o campo continua sujo e entra no próximo sync
        const emVoo = {}
        for (const [id, c] of Object.entries(campos)) if (c.dirty) emVoo[id] = c.t

        let r
        try {
          r = await api.saveWorkbook(payloadCompleto(), progressoAtual())
        } catch (e) {
          r = { ok: false, code: 'NETWORK', message: String(e?.message || e) }
        }

        if (r && r.ok) {
          tentativas = 0
          for (const [id, t] of Object.entries(emVoo)) {
            const c = campos[id]
            if (c && c.t === t) {
              c.dirty = 0
              storage.gravarCampo(uid, id, c).catch(() => {})
            }
          }
          // absorve campos em que o remoto venceu (outra aba/dispositivo)
          for (const [id, cr] of Object.entries(r.respostas || {})) {
            const cl = campos[id]
            if (!cl || cr.t > cl.t) {
              campos[id] = { v: cr.v, t: cr.t, dirty: 0 }
              valores[id] = cr.v
              storage.gravarCampo(uid, id, campos[id]).catch(() => {})
            }
          }
          progresso.preenchidas = contarPreenchidas(campos)
          contarPendentes()
          ultimaSync.value = new Date(now())
          status.value = pendentes.value > 0 ? 'salvando' : 'salvo'
        } else {
          const semRede = !onLine() || r?.code === 'NETWORK'
          status.value = semRede ? 'offline' : 'erro'   // 'erro' = servidor rejeitou (ex.: sessão expirada)
          agendarRetry()
        }
      } finally {
        promessaSync = null
      }
    })()
    const p = promessaSync
    p.then(() => {
      if (precisaResync) { precisaResync = false; if (pendentes.value > 0) agendarSync() }
    })
    return p
  }

  /** força sync agora (beforeunload / troca de rota). Aguarda o voo atual e,
   *  se sobrou pendência, roda mais um ciclo. */
  async function flush() {
    cancelarTimers()
    cancelarRetry()
    if (promessaSync) await promessaSync
    if (pendentes.value > 0) await executarSync()
  }

  return {
    init, reset, valores, get, set, status, ultimaSync, pendentes, flush,
    progresso, marcarOnboardingVisto,
  }
}

// singleton consumido pelas views (CONTRATO 2)
export const store = criarStore()
