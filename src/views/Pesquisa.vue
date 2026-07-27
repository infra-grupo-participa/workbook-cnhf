<script setup>
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LogoCNHF from '../components/LogoCNHF.vue'
import Check from '@lucide/vue/dist/esm/icons/check.mjs'
import Copy from '@lucide/vue/dist/esm/icons/copy.mjs'
import { SURVEY } from '../data/survey-schema.js'
import { currentUser, submitSurvey, signUpComPesquisa } from '../data/api.js'

const route = useRoute()
const router = useRouter()

// Dois modos:
//  - PÚBLICO: lead novo abriu o link /#/pesquisa sem login → responde as
//    perguntas, informa nome e e-mail POR ÚLTIMO, e ganha o acesso (tela final).
//  - LOGADO: aluno que já tem acesso mas ainda não respondeu (gate antigo) —
//    não pede nome/e-mail (já os tem).
const emailLogado = currentUser()
const modoPublico = !emailLogado
const travado = route.query.motivo === 'trava'

// dados de contato — pedidos SÓ no fim, no modo público. O e-mail é a chave
// de cruzamento/login; o WhatsApp vai pro CS e habilita a recuperação de senha.
const contato = ref({ nome: '', email: '', telefone: '' })
const respostas = ref({})

// FLUXO EM PASSOS (uma pergunta por tela). O E-MAIL vem PRIMEIRO no modo público:
// assim, se o lead abandonar no meio, o contato já foi capturado (permite re-disparo).
//   [público] 0        → tela do E-MAIL (captura antes do abandono)
//   [público] 1..TOTAL → perguntas de qualificação
//   [público] TOTAL+1  → tela do WHATSAPP (opcional)
//   [público] TOTAL+2  → tela do NOME
//   [logado]  0..TOTAL-1 → só as perguntas (nome/e-mail já existem)
const TOTAL = SURVEY.length
const PASSO_EMAIL = 0
const OFFSET_PERGUNTA = modoPublico ? 1 : 0   // no público, as perguntas começam no passo 1
const PASSO_WHATS = OFFSET_PERGUNTA + TOTAL
const PASSO_NOME = OFFSET_PERGUNTA + TOTAL + 1
const ultimoPasso = modoPublico ? PASSO_NOME : TOTAL - 1

const passo = ref(0)
const enviando = ref(false)
const erro = ref('')

// tela final "Obrigado" + credenciais (o momento mais crítico do funil)
const acesso = ref(null) // { email, senha, surveyPending }
const copiado = ref(false)
const guardei = ref(false) // o aluno confirmou que copiou/anotou a senha

// ============================================================
// RASCUNHO LOCAL — cada abandono é um lead perdido. Persistimos
// respostas + contato + passo no localStorage e retomamos em
// silêncio na volta (com saída "Recomeçar do zero").
// ============================================================
const CHAVE_RASCUNHO = 'wbcnhf-rascunho-pesquisa'
const VALIDADE_RASCUNHO = 7 * 24 * 60 * 60 * 1000  // 7 dias
const retomado = ref(false)

function lerRascunho() {
  try {
    const r = JSON.parse(localStorage.getItem(CHAVE_RASCUNHO) || 'null')
    if (!r || r.v !== 1) return null
    if (Date.now() - (r.ts || 0) > VALIDADE_RASCUNHO) return null
    if ((r.quem || 'publico') !== (emailLogado || 'publico')) return null
    return r
  } catch { return null }
}
// restaura ANTES de registrar os watchers (senão o restore regrava o rascunho)
{
  const r = lerRascunho()
  if (r) {
    respostas.value = r.respostas && typeof r.respostas === 'object' ? r.respostas : {}
    if (modoPublico && r.contato && typeof r.contato === 'object') {
      contato.value = { nome: '', email: '', telefone: '', ...r.contato }
    }
    const p = Number(r.passo)
    if (Number.isInteger(p) && p > 0 && p <= ultimoPasso) passo.value = p
    retomado.value = passo.value > 0 || Object.keys(respostas.value).length > 0
  }
}

let rascunhoTimer = null
function salvarRascunho() {
  clearTimeout(rascunhoTimer)
  rascunhoTimer = setTimeout(() => {
    try {
      localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify({
        v: 1,
        ts: Date.now(),
        quem: emailLogado || 'publico',
        passo: passo.value,
        contato: modoPublico
          ? { nome: contato.value.nome, email: contato.value.email, telefone: contato.value.telefone }
          : undefined,
        respostas: respostas.value,
      }))
    } catch { /* storage cheio/bloqueado: segue sem rascunho */ }
  }, 350)
}
function limparRascunho() {
  clearTimeout(rascunhoTimer)
  try { localStorage.removeItem(CHAVE_RASCUNHO) } catch { /* ok */ }
}
watch([passo, respostas, contato], salvarRascunho, { deep: true })

function recomecarDoZero() {
  limparRascunho()
  respostas.value = {}
  contato.value = { nome: '', email: '', telefone: '' }
  erros.value = { nome: '', email: '', telefone: '' }
  erro.value = ''
  passo.value = 0
  retomado.value = false
  progMax.value = 0
  nextTick(focarAtual)
}

// índice da pergunta atual (0..TOTAL-1) considerando o offset do e-mail
const idxPergunta = computed(() => passo.value - OFFSET_PERGUNTA)
const noEmail = computed(() => modoPublico && passo.value === PASSO_EMAIL)
const naPergunta = computed(() =>
  passo.value >= OFFSET_PERGUNTA && passo.value <= OFFSET_PERGUNTA + TOTAL - 1)
const atual = computed(() => (naPergunta.value ? SURVEY[idxPergunta.value] : null))
const noWhats = computed(() => modoPublico && passo.value === PASSO_WHATS)
const noNome = computed(() => modoPublico && passo.value === PASSO_NOME)
const ehUltimo = computed(() => passo.value === ultimoPasso)

// pergunta atual é opcional? (perguntas de texto não-obrigatórias ganham "Pular")
const opcionalAtual = computed(() => naPergunta.value && !!atual.value && !atual.value.obrigatoria)

// progresso: total de telas = perguntas (+ e-mail + WhatsApp + nome no público)
const etapasTotais = modoPublico ? TOTAL + 3 : TOTAL
// quantas telas ainda faltam (p/ a contagem regressiva)
const faltam = computed(() => Math.max(0, etapasTotais - 1 - passo.value))
const preenchidoAtual = computed(() => {
  if (noEmail.value) return !checarEmail()
  if (naPergunta.value) {
    // pergunta opcional → sempre pode avançar (com ou sem resposta)
    if (!atual.value.obrigatoria) return true
    const v = respostas.value[atual.value.id]
    if (v == null || String(v).trim().length === 0) return false
    // se a opção escolhida revela um sub-campo OBRIGATÓRIO, ele também precisa
    // estar preenchido para liberar o avanço (ex.: "Outra → qual?").
    const cond = condicionalAtual.value
    if (cond && cond.obrigatoria) {
      const sc = respostas.value[cond.id]
      if (sc == null || String(sc).trim().length === 0) return false
    }
    return true
  }
  if (noWhats.value) return true          // WhatsApp é opcional
  if (noNome.value) return !checarNome()
  return false
})

// erros por campo
const erros = ref({ nome: '', email: '', telefone: '' })
const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim())

// --- formatadores (evitam dado quebrado entrando na planilha) ---
function normalizarNome(v) {
  const minus = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])
  return String(v || '').trim().replace(/\s+/g, ' ').toLowerCase()
    .split(' ')
    .map((w) => (minus.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}
function blurNome() { contato.value.nome = normalizarNome(contato.value.nome); erros.value.nome = checarNome() }
function blurEmail() { contato.value.email = String(contato.value.email || '').trim().toLowerCase(); erros.value.email = checarEmail() }
function blurWhats() { erros.value.telefone = checarWhats() }

// máscara de telefone em tempo real: (XX) XXXXX-XXXX. Digitação vira máscara;
// colagem em qualquer formato é aceita (+55, pontos, espaços) — o +55 é
// descartado só para exibição; o servidor normaliza de verdade.
function mascararTelefone(v) {
  let d = String(v || '').replace(/\D/g, '')
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2)   // colou com +55
  d = d.slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return d.replace(/^(\d{2})(\d*)/, '($1) $2')
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d*)/, '($1) $2-$3')
  return d.replace(/^(\d{2})(\d{5})(\d*)/, '($1) $2-$3')
}

function checarNome() {
  const n = normalizarNome(contato.value.nome)
  if (!n) return 'Informe o seu nome completo.'
  if (n.length < 3 || !/\s/.test(n)) return 'Informe nome e sobrenome.'
  if (!/^[A-Za-zÀ-ÿ'’\s-]+$/.test(n)) return 'Use apenas letras no nome.'
  return ''
}
function checarEmail() {
  const e = String(contato.value.email || '').trim().toLowerCase()
  if (!e) return 'Informe o seu e-mail.'
  if (!emailValido(e)) return 'Informe um e-mail válido (ex.: nome@email.com).'
  return ''
}
function checarWhats() {
  const d = String(contato.value.telefone || '').replace(/\D/g, '')
  if (!d) return ''                       // opcional: vazio é permitido
  if (d.length < 10 || d.length > 11) return 'Informe o DDD + número completo.'
  return ''
}

// sub-campo condicional revelado pela opção escolhida na pergunta atual
const condicionalAtual = computed(() => {
  const q = atual.value
  if (!q || !q.revela) return null
  return q.revela[respostas.value[q.id]] || null
})

// ---- progresso HONESTO e monotônico: a barra nunca anda para trás por
// conta de validação/condicionais — só recua quando o aluno clica "Voltar".
// (marca d'água do maior progresso alcançado no fluxo à frente)
// NB: declarado DEPOIS de condicionalAtual — o `immediate` avalia
// preenchidoAtual já no setup, que alcança condicionalAtual (TDZ).
const progAlvo = computed(() =>
  Math.min(1, (passo.value + (preenchidoAtual.value ? 1 : 0)) / etapasTotais))
const progMax = ref(0)
watch(progAlvo, (v) => { if (v > progMax.value) progMax.value = v }, { immediate: true })

// radio: seleciona. Se a opção revela um sub-campo, NÃO auto-avança; senão avança.
function escolher(op) {
  const q = atual.value
  respostas.value[q.id] = op
  erro.value = ''
  if (q.revela) {
    // limpa sub-campos órfãos de OUTROS gatilhos — mas preserva o campo cujo id
    // é o mesmo do gatilho atual (ex.: 'origem_cliente' compartilhado entre
    // "De 4 a 10" e "Mais de 10").
    const idAtual = q.revela[op]?.id
    for (const [gatilho, campo] of Object.entries(q.revela)) {
      if (gatilho !== op && campo.id !== idAtual) delete respostas.value[campo.id]
    }
  }
  if (q.revela && q.revela[op]) return       // mostra o sub-campo; avança no botão
  setTimeout(() => { if (passo.value < ultimoPasso) passo.value++ }, 220)
}

// clique numa opção da SUB-pergunta (radio condicional): seleciona e, como ela
// é a última coisa que faltava nesta tela, também auto-avança — mesmo ritmo do
// card principal, pra não obrigar o lead a caçar o botão "Continuar".
function escolherCondicional(op) {
  const cond = condicionalAtual.value
  if (!cond) return
  respostas.value[cond.id] = op
  erro.value = ''
  setTimeout(() => { if (passo.value < ultimoPasso) passo.value++ }, 220)
}

// avança sem responder (perguntas opcionais e WhatsApp)
function pular() {
  if (opcionalAtual.value) {
    // limpa qualquer rascunho parcial da pergunta pulada
    if (atual.value) delete respostas.value[atual.value.id]
  }
  erro.value = ''
  if (ehUltimo.value) return finalizar()
  passo.value++
}

function avancar() {
  erro.value = ''
  if (noEmail.value) {
    erros.value.email = checarEmail()
    if (erros.value.email) return          // o erro do campo (aria-live) basta
    contato.value.email = contato.value.email.trim().toLowerCase()
    passo.value++
    return
  }
  if (naPergunta.value) {
    if (!preenchidoAtual.value) {
      const cond = condicionalAtual.value
      const faltaCond = cond && cond.obrigatoria &&
        !(respostas.value[cond.id] && String(respostas.value[cond.id]).trim())
      erro.value = faltaCond ? 'Preencha o campo acima para continuar.' : 'Responda para continuar.'
      return
    }
    if (ehUltimo.value) return finalizar()   // modo logado: última pergunta finaliza
    passo.value++
    return
  }
  if (noWhats.value) {
    erros.value.telefone = checarWhats()
    if (erros.value.telefone) return
    passo.value++
    return
  }
  if (noNome.value) {
    erros.value.nome = checarNome()
    if (erros.value.nome) return
    contato.value.nome = normalizarNome(contato.value.nome)
    return finalizar()
  }
}
function voltar() {
  erro.value = ''
  if (passo.value > 0) {
    passo.value--
    // voltar de propósito recua a marca d'água para a posição atual
    progMax.value = progAlvo.value
  }
}

async function finalizar() {
  erro.value = ''
  // garante que nenhuma pergunta obrigatória (nem sub-campo condicional
  // obrigatório revelado pela resposta) ficou vazia — defesa final.
  const vazio = (id) => !(respostas.value[id] && String(respostas.value[id]).trim())
  const faltando = SURVEY.find((q) => {
    if (q.obrigatoria && vazio(q.id)) return true
    const cond = q.revela && q.revela[respostas.value[q.id]]
    return cond && cond.obrigatoria && vazio(cond.id)
  })
  if (faltando) { erro.value = 'Ainda falta responder alguma pergunta.'; passo.value = OFFSET_PERGUNTA + SURVEY.indexOf(faltando); return }

  enviando.value = true
  if (modoPublico) {
    const r = await signUpComPesquisa({
      email: contato.value.email,
      nome: contato.value.nome,
      telefone: contato.value.telefone.replace(/\D/g, ''),
      answers: { ...respostas.value },
    })
    enviando.value = false
    if (!r.ok) {
      erro.value = r.code === 'EXISTS'
        ? 'Já existe um acesso com esse e-mail. Se já respondeu antes, faça o login.'
        : 'Não foi possível liberar o seu acesso agora. Tente novamente em instantes.'
      return
    }
    // sucesso → o funil converteu: rascunho não é mais necessário
    limparRascunho()
    acesso.value = { email: r.email, senha: r.senha, surveyPending: r.surveyPending }
  } else {
    const reg = await submitSurvey(emailLogado, { ...respostas.value })
    enviando.value = false
    if (reg && reg.ok === false) {
      erro.value = 'Não foi possível registrar as respostas agora. Tente novamente em instantes.'
      return
    }
    limparRascunho()
    router.push({ name: 'ambiente' })
  }
}

async function copiarSenha() {
  const senha = acesso.value?.senha || ''
  let ok = false
  try { await navigator.clipboard.writeText(senha); ok = true } catch { /* clipboard bloqueado */ }
  if (!ok) {
    // fallback p/ webview/permissão negada: seleção + execCommand
    try {
      const ta = document.createElement('textarea')
      ta.value = senha
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      ok = document.execCommand('copy')
      ta.remove()
    } catch { ok = false }
  }
  if (ok) {
    copiado.value = true
    setTimeout(() => { copiado.value = false }, 2200)
  }
}

async function entrarNoAmbiente() {
  if (acesso.value?.surveyPending) {
    const reg = await submitSurvey(acesso.value.email, { ...respostas.value }, contato.value.nome)
    if (reg.ok) acesso.value.surveyPending = false
  }
  router.push({ name: 'ambiente' })
}

// rótulo do topo (contexto de cada tela)
const eyebrow = computed(() => {
  if (noEmail.value) return 'Comece por aqui'
  if (noNome.value || noWhats.value) return 'Quase lá · seus dados de acesso'
  return `Pergunta ${idxPergunta.value + 1} de ${TOTAL}`
})

// contagem regressiva amigável (sensação de fim próximo → menos abandono)
const regressiva = computed(() => {
  if (ehUltimo.value) return 'Última etapa!'
  const n = faltam.value
  if (n === 1) return 'Falta só 1 etapa'
  return `Faltam ${n} etapas`
})

// --- foco ao trocar de tela: campo de texto quando houver; senão o título da
// pergunta (tabindex=-1), p/ leitor de tela anunciar a pergunta nova. Disparado
// no @after-enter da Transition (nextTick roda ANTES do out-in terminar).
const campoRef = ref(null)
const tituloRef = ref(null)
function focarAtual() {
  const el = campoRef.value
  if (el && typeof el.focus === 'function') el.focus()
  else if (tituloRef.value && typeof tituloRef.value.focus === 'function') tituloRef.value.focus()
}
onMounted(() => nextTick(focarAtual))
// esconde o aviso de retomada assim que o lead segue em frente
watch(passo, () => { if (retomado.value && !enviando.value) retomado.value = false })
</script>

<template>
  <div class="wrap">
    <header class="top">
      <LogoCNHF :height="34" />
      <span v-if="emailLogado" class="quem muted">{{ emailLogado }}</span>
    </header>

    <!-- ===== TELA FINAL: OBRIGADO + CREDENCIAIS ===== -->
    <div v-if="acesso" class="card box obrigado">
      <div class="check" aria-hidden="true"><Check :size="34" :stroke-width="3" /></div>
      <div class="eyebrow" style="text-align:center">Pesquisa concluída</div>
      <h1>Seu acesso está liberado!</h1>
      <p class="lead muted">
        Obrigado pelo preenchimento. Este é o seu acesso ao workbook do
        <strong>Curso Nacional de Formação em Holding Familiar</strong> —
        considere a primeira lacuna do curso já preenchida:
      </p>

      <!-- a senha como LACUNA PREENCHIDA: papel, linha pautada e tinta de
           resposta — a mesma gramática visual do workbook que o aluno vai abrir -->
      <div class="folha" role="group" aria-label="Seus dados de acesso">
        <div class="folha-cabeca">
          <span class="folha-titulo">Dados de acesso</span>
          <span class="folha-onde">workbook.cursoholding.com.br</span>
        </div>
        <div class="lacuna">
          <span class="lacuna-rot" id="rot-login">Login</span>
          <span class="lacuna-valor" aria-labelledby="rot-login">{{ acesso.email }}</span>
        </div>
        <div class="lacuna">
          <span class="lacuna-rot" id="rot-senha">Senha</span>
          <span
            class="lacuna-valor senha" aria-labelledby="rot-senha"
            :aria-label="'Senha: ' + acesso.senha.split('').join(' ')"
          >{{ acesso.senha }}</span>
          <button class="btn sm copiar" type="button" @click="copiarSenha">
            <component :is="copiado ? Check : Copy" :size="15" :stroke-width="2.5" aria-hidden="true" />
            {{ copiado ? 'Copiada!' : 'Copiar senha' }}
          </button>
          <span class="sr-only" aria-live="polite">{{ copiado ? 'Senha copiada para a área de transferência.' : '' }}</span>
        </div>
      </div>

      <p class="dica">
        Depois de entrar você pode trocá-la por uma senha sua em <em>“Trocar senha”</em>.
        Se perder, dá para recuperar na hora em <em>“Esqueci minha senha”</em> — com o
        seu e-mail e o seu WhatsApp.
      </p>
      <p v-if="modoPublico && !contato.telefone.trim()" class="alert warn sem-whats">
        Você não informou WhatsApp, então a recuperação automática de senha não
        estará disponível para você. Guarde a senha com cuidado redobrado.
      </p>

      <label class="guarda">
        <input type="checkbox" v-model="guardei" />
        <span>Já copiei ou anotei a minha senha em um lugar seguro.</span>
      </label>
      <button
        class="btn primary block grande" :disabled="!guardei"
        :aria-describedby="guardei ? undefined : 'guarda-aviso'"
        @click="entrarNoAmbiente"
      >Entrar no meu ambiente</button>
      <p v-if="!guardei" id="guarda-aviso" class="guarda-aviso muted">
        Confirme acima que guardou a senha para continuar.
      </p>
    </div>

    <!-- ===== PESQUISA (passo a passo) ===== -->
    <div v-else class="card box">
      <div class="eyebrow" aria-live="polite">{{ eyebrow }}</div>

      <div class="progresso">
        <div
          class="barra" role="progressbar" aria-label="Progresso da pesquisa"
          :aria-valuemin="0" :aria-valuemax="100" :aria-valuenow="Math.round(progMax * 100)"
        ><div class="fill" :style="{ width: (progMax * 100) + '%' }" /></div>
        <div class="progresso-legenda muted">{{ regressiva }}</div>
      </div>

      <div v-if="retomado" class="alert ok retomada" role="status">
        Bem-vindo de volta — retomamos de onde você parou.
        <button type="button" class="link recomecar" @click="recomecarDoZero">Recomeçar do zero</button>
      </div>

      <div v-if="modoPublico && passo === 0 && !retomado" class="alert warn">
        Responda esta pesquisa rápida e <strong>ganhe acesso imediato ao workbook</strong> do
        Curso Nacional de Formação em Holding Familiar — com o material das aulas para
        acompanhar e preencher. Leva menos de 2 minutos.
      </div>
      <div v-else-if="travado && passo === 0 && !retomado" class="alert warn">
        O seu acesso ao ambiente do aluno é liberado assim que você responde esta pesquisa rápida. É só uma vez.
      </div>

      <Transition name="fade" mode="out-in" @after-enter="focarAtual">
        <!-- PERGUNTA DE QUALIFICAÇÃO -->
        <div v-if="naPergunta" :key="'q-' + atual.id" class="q">
          <div class="q-label" ref="tituloRef" tabindex="-1">
            {{ atual.label }}
            <span v-if="opcionalAtual" class="chip-opcional">Opcional</span>
          </div>
          <p v-if="atual.ajuda" class="q-ajuda muted">{{ atual.ajuda }}</p>

          <div v-if="atual.tipo === 'radio'" class="opcoes" role="group" :aria-label="atual.label">
            <button
              v-for="op in atual.opcoes" :key="op" type="button"
              class="op" :class="{ sel: respostas[atual.id] === op }"
              :aria-pressed="respostas[atual.id] === op"
              @click="escolher(op)"
            >{{ op }}</button>
          </div>

          <!-- sub-campo condicional (desdobramento): "raiz do lead" -->
          <Transition name="fade">
            <div v-if="condicionalAtual" class="condicional" :key="condicionalAtual.id">
              <div class="cond-label">
                {{ condicionalAtual.label }}<em v-if="condicionalAtual.obrigatoria" class="obrig" aria-hidden="true">*</em>
              </div>

              <!-- sub-pergunta tipo radio (categorias padronizadas) -->
              <div v-if="condicionalAtual.tipo === 'radio'" class="opcoes" role="group" :aria-label="condicionalAtual.label">
                <button
                  v-for="op in condicionalAtual.opcoes" :key="op" type="button"
                  class="op" :class="{ sel: respostas[condicionalAtual.id] === op }"
                  :aria-pressed="respostas[condicionalAtual.id] === op"
                  @click="escolherCondicional(op)"
                >{{ op }}</button>
              </div>

              <!-- sub-pergunta tipo texto -->
              <label v-else class="field">
                <input
                  type="text" v-model="respostas[condicionalAtual.id]"
                  :placeholder="condicionalAtual.placeholder"
                  @keydown.enter="avancar"
                />
              </label>
            </div>
          </Transition>

          <textarea
            v-if="atual.tipo === 'textarea'" ref="campoRef"
            v-model="respostas[atual.id]" :placeholder="atual.placeholder"
            :aria-label="atual.label"
            @keydown.enter.exact.prevent="avancar"
            @keydown.ctrl.enter="avancar" @keydown.meta.enter="avancar"
          />
        </div>

        <!-- TELA DO E-MAIL (primeira do funil público: captura o contato cedo) -->
        <div v-else-if="noEmail" key="email" class="q">
          <div class="q-label">Qual o seu melhor e-mail?</div>
          <p class="q-ajuda muted">Será o seu login de acesso ao workbook — use o mesmo e-mail da sua inscrição.</p>
          <label class="field grande" for="pes-email">
            <input
              id="pes-email" ref="campoRef"
              type="email" v-model="contato.email" placeholder="voce@email.com"
              autocomplete="email" inputmode="email" :class="{ invalido: erros.email }"
              :aria-invalid="!!erros.email" aria-describedby="pes-email-erro"
              @input="erros.email = ''" @blur="blurEmail" @keydown.enter="avancar"
            />
            <small id="pes-email-erro" class="erro-campo" aria-live="polite">{{ erros.email }}</small>
          </label>
        </div>

        <!-- TELA DO WHATSAPP (opcional, mas habilita a recuperação de senha) -->
        <div v-else-if="noWhats" key="whats" class="q">
          <div class="q-label">Qual o seu WhatsApp? <span class="chip-opcional">Opcional</span></div>
          <p class="q-ajuda muted">
            É por onde você recebe os avisos das aulas — e é o que permite
            <strong>recuperar a sua senha na hora</strong> se um dia esquecer.
          </p>
          <label class="field grande" for="pes-tel">
            <input
              id="pes-tel" ref="campoRef"
              type="tel" :value="contato.telefone" placeholder="(11) 99999-9999"
              autocomplete="tel" inputmode="numeric" :class="{ invalido: erros.telefone }"
              :aria-invalid="!!erros.telefone" aria-describedby="pes-tel-erro"
              @input="contato.telefone = mascararTelefone($event.target.value); erros.telefone = ''"
              @blur="blurWhats" @keydown.enter="avancar"
            />
            <small id="pes-tel-erro" class="erro-campo" aria-live="polite">{{ erros.telefone }}</small>
          </label>
        </div>

        <!-- TELA DO NOME -->
        <div v-else key="nome" class="q">
          <div class="q-label">Como é o seu nome completo?</div>
          <p class="q-ajuda muted">É assim que vamos te chamar no ambiente do aluno.</p>
          <label class="field grande" for="pes-nome">
            <input
              id="pes-nome" ref="campoRef"
              type="text" v-model="contato.nome" placeholder="Seu nome completo"
              autocomplete="name" :class="{ invalido: erros.nome }"
              :aria-invalid="!!erros.nome" aria-describedby="pes-nome-erro"
              @input="erros.nome = ''" @blur="blurNome" @keydown.enter="avancar"
            />
            <small id="pes-nome-erro" class="erro-campo" aria-live="polite">{{ erros.nome }}</small>
          </label>
        </div>
      </Transition>

      <div v-if="erro" class="alert bad" role="alert" style="margin-top:14px">{{ erro }}</div>

      <div class="nav">
        <button type="button" class="btn ghost" :disabled="passo === 0" @click="voltar">Voltar</button>
        <div class="nav-dir">
          <!-- Pular: perguntas opcionais e WhatsApp (não trava o funil) -->
          <button
            v-if="opcionalAtual || noWhats" type="button"
            class="btn ghost pular" :disabled="enviando" @click="pular"
          >Pular</button>
          <button type="button" class="btn primary" :disabled="enviando" @click="avancar">
            {{ enviando ? 'Liberando acesso...' : (ehUltimo ? 'Finalizar e liberar meu acesso' : 'Continuar') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wrap { position: relative; z-index: 1; max-width: 600px; margin: 0 auto; padding: 28px 18px 60px; }
/* logo sempre centralizado; e-mail do logado fica absoluto p/ não deslocar o logo */
.top { position: relative; display: flex; align-items: center; justify-content: center; color: var(--ink); margin-bottom: 22px; }
.top .quem { position: absolute; right: 0; top: 50%; transform: translateY(-50%); font-size: 12.5px; max-width: 40%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 520px) { .top .quem { display: none; } }

.box { padding: 32px 34px; min-height: 400px; display: flex; flex-direction: column; }
@media (max-width: 480px) { .box { padding: 24px 20px; } }

.progresso { margin: 14px 0 22px; }
.barra { height: 8px; border-radius: 999px; background: var(--stroke); overflow: hidden; }
.fill { height: 100%; background: var(--accent); border-radius: 999px; transition: width .35s cubic-bezier(.4,0,.2,1); }
.progresso-legenda { font-size: 12px; font-weight: 600; margin-top: 7px; text-align: right; letter-spacing: .01em; }

.retomada { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px; margin-bottom: 14px; }
.recomecar { font-size: inherit; text-decoration: underline; color: inherit; }

.q { flex: 1; }
.q-label { font-size: 22px; font-weight: 700; line-height: 1.35; margin-bottom: 8px; letter-spacing: -0.01em; }
.q-ajuda { font-size: 14px; margin: 0 0 22px; line-height: 1.5; }

.chip-opcional {
  display: inline-block; vertical-align: 3px; margin-left: 6px;
  font-size: 10.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase;
  color: var(--ink-2); border: 1px solid var(--stroke-strong);
  border-radius: 999px; padding: 3px 9px;
}

.opcoes { display: flex; flex-direction: column; gap: 11px; margin-top: 12px; }
.op {
  text-align: left; font: inherit; font-size: 15.5px; color: var(--ink);
  padding: 16px 18px; border: 1px solid var(--stroke-strong); border-radius: var(--radius-sm);
  background: var(--surface); cursor: pointer;
  transition: border-color .14s, background .14s, transform .08s, box-shadow .14s;
}
.op:hover { border-color: var(--accent-line); box-shadow: 0 2px 12px rgba(255,107,0,.07); }
.op:active { transform: scale(.99); }
.op.sel { border-color: var(--accent); background: var(--accent-soft); font-weight: 600; box-shadow: 0 0 0 3px var(--accent-soft); }

.field.grande input { font-size: 17px; padding: 15px 16px; }
/* erro AA nos três temas — token global do F1 (6.5/6.6/9.0:1) */
.erro-campo { color: var(--bad-text, #b02c17); font-size: 12.5px; font-weight: 600; margin-top: 6px; display: block; }
.erro-campo:empty { display: none; }
.condicional { margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--stroke); }
.cond-label { font-size: 16px; font-weight: 700; line-height: 1.35; margin-bottom: 12px; }
.obrig { color: var(--accent); font-style: normal; font-weight: 700; margin-left: 2px; }
textarea { min-height: 140px; font-size: 15.5px; margin-top: 4px; }

.nav { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 28px; }
.nav .btn { min-width: 108px; min-height: 44px; }
.nav-dir { display: flex; gap: 10px; align-items: center; }
.nav-dir .pular { min-width: auto; color: var(--ink-2); }
.nav-dir .pular:hover { color: var(--ink); }
@media (max-width: 420px) { .nav-dir .pular { min-width: 84px; } }

.fade-enter-active, .fade-leave-active { transition: opacity .2s ease, transform .2s ease; }
.fade-enter-from { opacity: 0; transform: translateX(14px); }
.fade-leave-to { opacity: 0; transform: translateX(-14px); }

/* ===== TELA "OBRIGADO" + CREDENCIAIS (momento de conversão) ===== */
.obrigado { text-align: center; align-items: stretch; }
.check {
  width: 64px; height: 64px; margin: 4px auto 16px; border-radius: 50%;
  background: var(--accent-soft); color: var(--accent); display: grid; place-items: center;
  border: 1px solid var(--accent-line);
}
.obrigado h1 { font-size: 27px; margin: 8px 0 12px; letter-spacing: -0.02em; }
.obrigado .lead { font-size: 15px; line-height: 1.6; max-width: 460px; margin: 0 auto 8px; }

/* a "folha": um recorte do papel do workbook, com a senha escrita na pauta
   em tinta de resposta (Literata itálica) — mesma linguagem das lacunas */
.folha {
  margin: 22px 0 6px; padding: 20px 22px 22px; text-align: left;
  background: var(--papel); border: 1px solid var(--stroke-strong);
  border-radius: var(--radius-sm);
}
.folha-cabeca {
  display: flex; justify-content: space-between; align-items: baseline; gap: 10px;
  flex-wrap: wrap; margin-bottom: 14px;
}
.folha-titulo { font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--tinta-2); }
.folha-onde { font-size: 12px; color: var(--tinta-2); }
.lacuna { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; padding: 10px 0 2px; }
.lacuna + .lacuna { margin-top: 10px; }
.lacuna-rot { flex: none; width: 52px; font-size: 12px; font-weight: 700; color: var(--tinta-2); }
.lacuna-valor {
  flex: 1; min-width: 180px; padding: 0 2px 4px;
  font-family: var(--fonte-livro); font-style: italic;
  font-size: 17px; color: var(--resposta);
  border-bottom: 1px solid var(--pauta); word-break: break-all;
}
.lacuna-valor.senha { font-size: 21px; letter-spacing: .05em; }
.btn.sm.copiar { font-size: 12.5px; padding: 8px 13px; min-height: 40px; flex: none; align-self: center; }

.dica { font-size: 13px; line-height: 1.55; color: var(--ink-2); margin: 14px 0 0; text-align: left; }
.dica em { font-style: normal; font-weight: 600; color: var(--ink); }
.sem-whats { margin: 12px 0 0; text-align: left; }

/* confirmação "guardei a senha" — o gate do botão (alvo ≥44px) */
.guarda {
  display: flex; align-items: center; gap: 10px; text-align: left;
  margin: 18px 0 0; padding: 12px 14px; min-height: 44px;
  border: 1px solid var(--stroke); border-radius: var(--radius-sm);
  cursor: pointer; font-size: 14px; line-height: 1.45; color: var(--ink);
}
.guarda input { width: 18px; height: 18px; flex: none; accent-color: var(--accent); cursor: pointer; }
.guarda-aviso { font-size: 12.5px; margin: 8px 0 0; }

.block { width: 100%; }
.btn.grande { margin-top: 14px; font-size: 15.5px; padding: 14px 18px; min-height: 48px; }

.sr-only {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
</style>
