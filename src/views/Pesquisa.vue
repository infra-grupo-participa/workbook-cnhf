<script setup>
import { ref, computed } from 'vue'
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
// de cruzamento; WhatsApp não é coletado.
const contato = ref({ nome: '', email: '' })
const respostas = ref({})

// FLUXO EM PASSOS (uma pergunta por tela):
//   0 .. TOTAL-1  → perguntas de qualificação
//   [público] TOTAL   → tela do NOME
//   [público] TOTAL+1 → tela do E-MAIL
const TOTAL = SURVEY.length
const PASSO_NOME = TOTAL
const PASSO_EMAIL = TOTAL + 1
const ultimoPasso = modoPublico ? PASSO_EMAIL : TOTAL - 1

const passo = ref(0)
const enviando = ref(false)
const erro = ref('')

// tela final "Obrigado" + credenciais (substitui o modal)
const acesso = ref(null) // { email, senha, surveyPending }
const copiado = ref(false)

const atual = computed(() => SURVEY[passo.value] || null)     // pergunta atual (ou null nas telas de contato)
const naPergunta = computed(() => passo.value <= TOTAL - 1)
const noNome = computed(() => passo.value === PASSO_NOME)
const noEmail = computed(() => passo.value === PASSO_EMAIL)
const ehUltimo = computed(() => passo.value === ultimoPasso)

// progresso: total de telas = perguntas (+ nome + e-mail no público)
const etapasTotais = modoPublico ? TOTAL + 2 : TOTAL
const preenchidoAtual = computed(() => {
  if (naPergunta.value) {
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
  if (noNome.value) return !checarNome()
  if (noEmail.value) return !checarEmail()
  return false
})

// erros por campo
const erros = ref({ nome: '', email: '' })
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

// sub-campo condicional revelado pela opção escolhida na pergunta atual
const condicionalAtual = computed(() => {
  const q = atual.value
  if (!q || !q.revela) return null
  return q.revela[respostas.value[q.id]] || null
})

// radio: seleciona. Se a opção revela um sub-campo, NÃO auto-avança; senão avança.
function escolher(op) {
  const q = atual.value
  respostas.value[q.id] = op
  erro.value = ''
  if (q.revela) {
    for (const [gatilho, campo] of Object.entries(q.revela)) {
      if (gatilho !== op) delete respostas.value[campo.id]
    }
  }
  if (q.revela && q.revela[op]) return       // mostra o sub-campo; avança no botão
  setTimeout(() => { if (passo.value < ultimoPasso) passo.value++ }, 220)
}

function avancar() {
  erro.value = ''
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
  if (noNome.value) {
    erros.value.nome = checarNome()
    if (erros.value.nome) { erro.value = erros.value.nome; return }
    contato.value.nome = normalizarNome(contato.value.nome)
    passo.value++
    return
  }
  if (noEmail.value) {
    erros.value.email = checarEmail()
    if (erros.value.email) { erro.value = erros.value.email; return }
    contato.value.email = contato.value.email.trim().toLowerCase()
    return finalizar()
  }
}
function voltar() {
  erro.value = ''
  if (passo.value > 0) passo.value--
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
  if (faltando) { erro.value = 'Ainda falta responder alguma pergunta.'; passo.value = SURVEY.indexOf(faltando); return }

  enviando.value = true
  if (modoPublico) {
    const r = await signUpComPesquisa({
      email: contato.value.email,
      nome: contato.value.nome,
      answers: { ...respostas.value },
    })
    enviando.value = false
    if (!r.ok) {
      erro.value = r.code === 'EXISTS'
        ? 'Já existe um acesso com esse e-mail. Se já respondeu antes, faça o login.'
        : 'Não foi possível liberar o seu acesso agora. Tente novamente em instantes.'
      return
    }
    // sucesso → tela "Obrigado" com as credenciais
    acesso.value = { email: r.email, senha: r.senha, surveyPending: r.surveyPending }
  } else {
    await submitSurvey(emailLogado, { ...respostas.value })
    enviando.value = false
    router.push({ name: 'ambiente' })
  }
}

async function copiarSenha() {
  try {
    await navigator.clipboard.writeText(acesso.value.senha)
    copiado.value = true
    setTimeout(() => { copiado.value = false }, 1800)
  } catch { /* clipboard bloqueado — o aluno copia manualmente */ }
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
  if (noNome.value || noEmail.value) return 'Quase lá · seus dados de acesso'
  return `Pesquisa de qualificação · pergunta ${passo.value + 1} de ${TOTAL}`
})
</script>

<template>
  <div class="wrap">
    <header class="top">
      <LogoCNHF :height="34" />
      <span v-if="emailLogado" class="quem muted">{{ emailLogado }}</span>
    </header>

    <!-- ===== TELA FINAL: OBRIGADO + CREDENCIAIS ===== -->
    <div v-if="acesso" class="card box obrigado">
      <div class="check"><Check :size="34" :stroke-width="3" /></div>
      <div class="eyebrow" style="text-align:center">Pesquisa concluída</div>
      <h1>Obrigado pelo preenchimento!</h1>
      <p class="lead muted">
        Suas respostas foram registradas com sucesso. O seu acesso ao workbook do
        <strong>Curso Nacional de Formação em Holding Familiar</strong> já está liberado.
      </p>

      <div class="acesso-bloco">
        <div class="acesso-titulo">Seus dados de acesso</div>
        <p class="acesso-instrucao muted">
          Guarde estas informações. Use-as para entrar no ambiente do aluno em
          <strong>workbook.cursoholding.com.br</strong> sempre que quiser.
        </p>

        <div class="creds">
          <div class="cred">
            <span class="rot">Seu e-mail (login)</span>
            <span class="val mono">{{ acesso.email }}</span>
          </div>
          <div class="cred">
            <span class="rot">Sua senha provisória</span>
            <div class="senha-row">
              <span class="val mono senha">{{ acesso.senha }}</span>
              <button class="btn ghost sm" @click="copiarSenha">
                <component :is="copiado ? Check : Copy" :size="15" :stroke-width="2.5" />
                {{ copiado ? 'Copiada' : 'Copiar' }}
              </button>
            </div>
          </div>
        </div>

        <p class="dica"><strong>Dica:</strong> anote a senha antes de continuar. Depois de entrar,
          você pode trocá-la por uma da sua preferência em <em>“Trocar senha”</em>.</p>
      </div>

      <button class="btn primary block grande" @click="entrarNoAmbiente">Entrar no meu ambiente</button>
    </div>

    <!-- ===== PESQUISA (passo a passo) ===== -->
    <div v-else class="card box">
      <div class="eyebrow">{{ eyebrow }}</div>

      <div class="progresso">
        <div class="barra"><div class="fill" :style="{ width: ((passo + (preenchidoAtual ? 1 : 0)) / etapasTotais * 100) + '%' }" /></div>
      </div>

      <div v-if="modoPublico && passo === 0" class="alert warn">
        Responda esta pesquisa rápida para liberar o seu acesso ao workbook. Ao final,
        você recebe os seus dados de acesso.
      </div>
      <div v-else-if="travado && passo === 0" class="alert warn">
        O seu acesso ao ambiente do aluno é liberado assim que você responde esta pesquisa rápida. É só uma vez.
      </div>

      <Transition name="fade" mode="out-in">
        <!-- PERGUNTA DE QUALIFICAÇÃO -->
        <div v-if="naPergunta" :key="'q-' + atual.id" class="q">
          <div class="q-label">{{ atual.label }}</div>

          <div v-if="atual.tipo === 'radio'" class="opcoes">
            <button
              v-for="op in atual.opcoes" :key="op" type="button"
              class="op" :class="{ sel: respostas[atual.id] === op }"
              @click="escolher(op)"
            >{{ op }}</button>
          </div>

          <!-- sub-campo condicional (desdobramento): ex. "Outra → qual?" -->
          <Transition name="fade">
            <label v-if="condicionalAtual" class="field condicional" :key="condicionalAtual.id">
              <span>{{ condicionalAtual.label }}<em v-if="condicionalAtual.obrigatoria" class="obrig">*</em></span>
              <input
                type="text" v-model="respostas[condicionalAtual.id]"
                :placeholder="condicionalAtual.placeholder"
                @keydown.enter="avancar"
              />
            </label>
          </Transition>

          <textarea
            v-if="atual.tipo === 'textarea'" v-model="respostas[atual.id]" :placeholder="atual.placeholder"
            @keydown.ctrl.enter="avancar" @keydown.meta.enter="avancar"
          />
        </div>

        <!-- TELA DO NOME -->
        <div v-else-if="noNome" key="nome" class="q">
          <div class="q-label">Como é o seu nome completo?</div>
          <p class="q-ajuda muted">É assim que vamos te chamar no ambiente do aluno.</p>
          <label class="field grande">
            <input
              type="text" v-model="contato.nome" placeholder="Seu nome completo"
              autocomplete="name" :class="{ invalido: erros.nome }"
              @input="erros.nome = ''" @blur="blurNome" @keydown.enter="avancar"
            />
            <small v-if="erros.nome" class="erro-campo">{{ erros.nome }}</small>
          </label>
        </div>

        <!-- TELA DO E-MAIL -->
        <div v-else key="email" class="q">
          <div class="q-label">Qual o seu melhor e-mail?</div>
          <p class="q-ajuda muted">Será o seu login de acesso — use o mesmo e-mail da sua inscrição.</p>
          <label class="field grande">
            <input
              type="email" v-model="contato.email" placeholder="voce@email.com"
              autocomplete="email" inputmode="email" :class="{ invalido: erros.email }"
              @input="erros.email = ''" @blur="blurEmail" @keydown.enter="avancar"
            />
            <small v-if="erros.email" class="erro-campo">{{ erros.email }}</small>
          </label>
        </div>
      </Transition>

      <div v-if="erro" class="alert bad" style="margin-top:14px">{{ erro }}</div>

      <div class="nav">
        <button class="btn ghost" :disabled="passo === 0" @click="voltar">Voltar</button>
        <button class="btn primary" :disabled="enviando" @click="avancar">
          {{ enviando ? 'Liberando acesso...' : (ehUltimo ? 'Finalizar e liberar meu acesso' : 'Continuar') }}
        </button>
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

.q { flex: 1; }
.q-label { font-size: 22px; font-weight: 700; line-height: 1.35; margin-bottom: 8px; letter-spacing: -0.01em; }
.q-ajuda { font-size: 14px; margin: 0 0 22px; line-height: 1.5; }

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
.erro-campo { color: var(--bad); font-size: 12.5px; font-weight: 600; margin-top: 6px; display: block; }
.condicional { margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--stroke); }
.obrig { color: var(--accent); font-style: normal; font-weight: 700; margin-left: 2px; }
textarea { min-height: 140px; font-size: 15.5px; margin-top: 4px; }

.nav { display: flex; justify-content: space-between; gap: 12px; margin-top: 28px; }
.nav .btn { min-width: 108px; }

.fade-enter-active, .fade-leave-active { transition: opacity .2s ease, transform .2s ease; }
.fade-enter-from { opacity: 0; transform: translateX(14px); }
.fade-leave-to { opacity: 0; transform: translateX(-14px); }

/* ===== TELA "OBRIGADO" + CREDENCIAIS ===== */
.obrigado { text-align: center; align-items: stretch; }
.check {
  width: 64px; height: 64px; margin: 4px auto 16px; border-radius: 50%;
  background: var(--accent-soft); color: var(--accent); display: grid; place-items: center;
  border: 1px solid var(--accent-line);
}
.obrigado h1 { font-size: 27px; margin: 8px 0 12px; letter-spacing: -0.02em; }
.obrigado .lead { font-size: 15px; line-height: 1.6; max-width: 460px; margin: 0 auto 8px; }

.acesso-bloco {
  margin: 24px 0 8px; padding: 22px 22px 20px; text-align: left;
  border: 1px solid var(--accent-line); border-radius: var(--radius);
  background: var(--accent-soft);
}
.acesso-titulo { font-size: 15px; font-weight: 800; color: var(--ink); margin-bottom: 4px; }
.acesso-instrucao { font-size: 13px; line-height: 1.5; margin: 0 0 16px; }

.creds { display: flex; flex-direction: column; gap: 12px; }
.cred { background: var(--surface); border: 1px solid var(--stroke-strong); border-radius: var(--radius-sm); padding: 13px 15px; }
.rot { display: block; font-size: 10.5px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink-3); font-weight: 800; margin-bottom: 5px; }
.val { font-size: 15px; color: var(--ink); word-break: break-all; }
.mono { font-family: ui-monospace, Menlo, Consolas, monospace; }
.senha-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.senha-row .senha { font-size: 19px; font-weight: 700; letter-spacing: .06em; }
.btn.sm { font-size: 12.5px; padding: 7px 13px; flex: none; }

.dica { font-size: 13px; line-height: 1.55; color: var(--ink-2); margin: 16px 0 0; }
.dica em { font-style: normal; font-weight: 600; color: var(--ink); }

.block { width: 100%; }
.btn.grande { margin-top: 22px; font-size: 15.5px; padding: 14px 18px; }
</style>
