<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LogoCNHF from '../components/LogoCNHF.vue'
import { SURVEY } from '../data/survey-schema.js'
import { currentUser, submitSurvey, signUpComPesquisa } from '../data/api.js'

const route = useRoute()
const router = useRouter()

// Dois modos:
//  - PÚBLICO: lead novo abriu o link /#/pesquisa sem login → coleta contato,
//    cria o acesso ao final e mostra a senha no modal.
//  - LOGADO: aluno que já tem acesso mas ainda não respondeu (gate antigo).
const emailLogado = currentUser()
const modoPublico = !emailLogado
const travado = route.query.motivo === 'trava'

// dados de contato (só no modo público) — etapa 0
const contato = ref({ nome: '', email: '', telefone: '' })

const respostas = ref({})
// passo -1 = etapa de contato (só público); 0..n-1 = perguntas
const passo = ref(modoPublico ? -1 : 0)
const enviando = ref(false)
const erro = ref('')

// modal de acesso liberado (público)
const acesso = ref(null) // { email, senha }
const copiado = ref(false)

const total = SURVEY.length
const naContato = computed(() => passo.value === -1)
const atual = computed(() => SURVEY[passo.value] || null)
const ultima = computed(() => passo.value === total - 1)

// para a barra de progresso: no público a etapa de contato conta como +1
const etapasTotais = modoPublico ? total + 1 : total
const etapaAtual = computed(() => (modoPublico ? passo.value + 1 : passo.value))

const respondida = computed(() => {
  if (naContato.value) return false
  const v = respostas.value[atual.value.id]
  return v != null && String(v).trim().length > 0
})

const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim())

function contatoValido() {
  if (!contato.value.nome.trim()) { erro.value = 'Informe o seu nome.'; return false }
  if (!emailValido(contato.value.email)) { erro.value = 'Informe um e-mail válido.'; return false }
  if (contato.value.telefone.replace(/\D/g, '').length < 10) { erro.value = 'Informe um WhatsApp válido com DDD.'; return false }
  return true
}

function avancar() {
  erro.value = ''
  if (naContato.value) {
    if (!contatoValido()) return
    passo.value = 0
    return
  }
  if (!respondida.value) { erro.value = 'Responda para continuar.'; return }
  if (ultima.value) return finalizar()
  passo.value++
}
function voltar() {
  erro.value = ''
  if (passo.value > (modoPublico ? -1 : 0)) passo.value--
}

// radio: seleciona e já avança (estilo etapa por etapa)
function escolher(op) {
  respostas.value[atual.value.id] = op
  erro.value = ''
  setTimeout(() => { if (!ultima.value) passo.value++; }, 220)
}

async function finalizar() {
  erro.value = ''
  const faltando = SURVEY.find((q) => q.obrigatoria && !(respostas.value[q.id] && String(respostas.value[q.id]).trim()))
  if (faltando) { erro.value = 'Ainda falta responder alguma pergunta.'; passo.value = SURVEY.indexOf(faltando); return }

  enviando.value = true
  if (modoPublico) {
    const r = await signUpComPesquisa({
      email: contato.value.email,
      nome: contato.value.nome,
      telefone: contato.value.telefone,
      answers: { ...respostas.value },
    })
    enviando.value = false
    if (!r.ok) {
      if (r.code === 'EXISTS') {
        erro.value = 'Já existe um acesso com esse e-mail. Se já respondeu antes, faça o login.'
      } else {
        erro.value = 'Não foi possível liberar o seu acesso agora. Tente novamente em instantes.'
      }
      return
    }
    // sucesso → mostra o modal com os dados de acesso
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
  // se a gravação da pesquisa ficou pendente (falha transitória após o
  // acesso já criado), tenta de novo agora — o usuário está autenticado.
  if (acesso.value?.surveyPending) {
    const reg = await submitSurvey(acesso.value.email, { ...respostas.value }, contato.value.nome)
    if (reg.ok) acesso.value.surveyPending = false
  }
  // já está logado (o signUp criou a sessão) → vai direto pro ambiente
  router.push({ name: 'ambiente' })
}
</script>

<template>
  <div class="wrap">
    <header class="top">
      <LogoCNHF :height="32" />
      <span v-if="emailLogado" class="muted" style="font-size:12.5px">{{ emailLogado }}</span>
    </header>

    <div class="card box">
      <div class="eyebrow" v-if="naContato">Pesquisa de qualificação · CNHF</div>
      <div class="eyebrow" v-else>Pesquisa de qualificação · pergunta {{ passo + 1 }} de {{ total }}</div>

      <div class="progresso">
        <div class="barra"><div class="fill" :style="{ width: ((etapaAtual + (respondida ? 1 : 0)) / etapasTotais * 100) + '%' }" /></div>
      </div>

      <div v-if="modoPublico && naContato" class="alert warn">
        Responda esta pesquisa rápida para liberar o seu acesso ao workbook do
        Curso Nacional de Formação em Holding Familiar. Ao final, você recebe os
        seus dados de acesso.
      </div>
      <div v-else-if="travado && passo === 0" class="alert warn">
        O seu acesso ao ambiente do aluno é liberado assim que você responde esta pesquisa rápida. É só uma vez.
      </div>

      <!-- ETAPA DE CONTATO (só modo público) -->
      <Transition name="fade" mode="out-in">
        <div v-if="naContato" key="contato" class="q">
          <div class="q-label">Antes de começar, seus dados de contato</div>
          <div class="form">
            <label class="field">
              <span>Nome completo</span>
              <input type="text" v-model="contato.nome" placeholder="Seu nome" autocomplete="name" @keydown.enter="avancar" />
            </label>
            <label class="field">
              <span>E-mail</span>
              <input type="email" v-model="contato.email" placeholder="voce@email.com" autocomplete="email" @keydown.enter="avancar" />
            </label>
            <label class="field">
              <span>WhatsApp (com DDD)</span>
              <input type="tel" v-model="contato.telefone" placeholder="(11) 99999-9999" autocomplete="tel" @keydown.enter="avancar" />
            </label>
          </div>
        </div>

        <!-- PERGUNTA ÚNICA DA ETAPA -->
        <div v-else :key="atual.id" class="q">
          <div class="q-label">{{ atual.label }}</div>

          <div v-if="atual.tipo === 'radio'" class="opcoes">
            <button
              v-for="op in atual.opcoes" :key="op" type="button"
              class="op" :class="{ sel: respostas[atual.id] === op }"
              @click="escolher(op)"
            >{{ op }}</button>
          </div>

          <textarea
            v-else v-model="respostas[atual.id]" :placeholder="atual.placeholder"
            @keydown.ctrl.enter="avancar" @keydown.meta.enter="avancar" autofocus
          />
        </div>
      </Transition>

      <div v-if="erro" class="alert bad" style="margin-top:14px">{{ erro }}</div>

      <div class="nav">
        <button class="btn ghost" :disabled="passo === (modoPublico ? -1 : 0)" @click="voltar">Voltar</button>
        <button class="btn primary" :disabled="enviando" @click="avancar">
          {{ enviando ? 'Liberando...' : (naContato ? 'Começar' : (ultima ? 'Finalizar e liberar meu acesso' : 'Continuar')) }}
        </button>
      </div>
    </div>

    <!-- MODAL: acesso liberado (só modo público) -->
    <Teleport to="body">
      <div v-if="acesso" class="overlay">
        <div class="pop card">
          <div class="check">✓</div>
          <div class="eyebrow" style="text-align:center">Acesso liberado</div>
          <h3>Pronto! Seu acesso ao workbook está garantido</h3>
          <p class="muted"><strong>Anote a sua senha antes de continuar.</strong> Você vai usar estes dados para entrar no ambiente do aluno sempre que quiser.</p>

          <div class="creds">
            <div class="cred">
              <span class="rot">E-mail</span>
              <span class="val mono">{{ acesso.email }}</span>
            </div>
            <div class="cred">
              <span class="rot">Senha</span>
              <div class="senha-row">
                <span class="val mono">{{ acesso.senha }}</span>
                <button class="btn ghost sm" @click="copiarSenha">{{ copiado ? '✓ Copiada' : 'Copiar' }}</button>
              </div>
            </div>
          </div>

          <p class="dica muted">Dica: depois de entrar, você pode trocar a senha por uma da sua preferência em “Trocar senha”.</p>

          <button class="btn primary block" @click="entrarNoAmbiente">Entrar no meu ambiente</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.wrap { position: relative; z-index: 1; max-width: 620px; margin: 0 auto; padding: 24px 18px 60px; }
.top { display: flex; align-items: center; justify-content: space-between; color: var(--ink); margin-bottom: 18px; }
.box { padding: 30px 32px; min-height: 380px; display: flex; flex-direction: column; }
.progresso { margin: 12px 0 20px; }
.barra { height: 8px; border-radius: 999px; background: var(--stroke); overflow: hidden; }
.fill { height: 100%; background: var(--accent); border-radius: 999px; transition: width .3s ease; }
.q { flex: 1; }
.q-label { font-size: 21px; font-weight: 700; line-height: 1.35; margin-bottom: 20px; }
.form { display: flex; flex-direction: column; gap: 14px; }
.opcoes { display: flex; flex-direction: column; gap: 10px; }
.op {
  text-align: left; font: inherit; font-size: 15px; color: var(--ink);
  padding: 15px 18px; border: 1px solid var(--stroke-strong); border-radius: var(--radius-sm);
  background: var(--surface); cursor: pointer; transition: border-color .12s, background .12s, transform .08s;
}
.op:hover { border-color: var(--accent-line); }
.op:active { transform: scale(.99); }
.op.sel { border-color: var(--accent); background: var(--accent-soft); font-weight: 600; }
textarea { min-height: 130px; font-size: 15px; }
.nav { display: flex; justify-content: space-between; gap: 12px; margin-top: 24px; }

.fade-enter-active, .fade-leave-active { transition: opacity .18s ease, transform .18s ease; }
.fade-enter-from { opacity: 0; transform: translateX(12px); }
.fade-leave-to { opacity: 0; transform: translateX(-12px); }

/* modal de acesso liberado */
.overlay { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,.55); backdrop-filter: blur(6px); display: grid; place-items: center; padding: 24px; }
.pop { width: min(460px, 100%); padding: 30px 30px 26px; text-align: center; }
.check { width: 54px; height: 54px; margin: 0 auto 12px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; font-size: 26px; font-weight: 900; border: 1px solid var(--accent-line); }
.pop h3 { margin: 6px 0 10px; font-size: 20px; line-height: 1.3; }
.pop p { font-size: 14px; line-height: 1.6; margin: 0; }
.creds { margin: 20px 0 8px; display: flex; flex-direction: column; gap: 10px; text-align: left; }
.cred { background: var(--surface); border: 1px solid var(--stroke-strong); border-radius: var(--radius-sm); padding: 12px 14px; }
.rot { display: block; font-size: 10.5px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink-3); font-weight: 700; margin-bottom: 4px; }
.val { font-size: 15px; color: var(--ink); }
.mono { font-family: ui-monospace, Menlo, monospace; }
.senha-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.senha-row .val { font-size: 17px; font-weight: 700; letter-spacing: .04em; }
.btn.sm { font-size: 12px; padding: 6px 12px; }
.dica { font-size: 12.5px; margin: 12px 0 18px; }
.block { width: 100%; }
</style>
