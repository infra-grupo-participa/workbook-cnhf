<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LogoCNHF from '../components/LogoCNHF.vue'
import { SURVEY } from '../data/survey-schema.js'
import { signUpComPesquisa, entrarComPesquisaExistente, submitSurvey } from '../data/api.js'
import { checarNome, checarEmail, checarWhats, normalizarNome, mascararTelefone } from '../data/validacao-contato.js'

// registro curto (2026-08-18, decisão do Marcio): tela única — nome, e-mail,
// WhatsApp (obrigatório aqui), profissão e faturamento. Sem passo a passo,
// sem rascunho local: quem quer as 4 perguntas abertas usa /pesquisa.
const route = useRoute()
const router = useRouter()

const QTD_AREA = SURVEY.find((q) => q.id === 'area')
const QTD_FATURAMENTO = SURVEY.find((q) => q.id === 'faturamento')

const nome = ref('')
const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const telefone = ref('')
const area = ref('')
const faturamento = ref('')

const erros = ref({ nome: '', email: '', telefone: '', area: '', faturamento: '' })
const erro = ref('')
const enviando = ref(false)

function limparErroCampo(campo) {
  erros.value[campo] = ''
  erro.value = ''
}

function blurNome() { nome.value = normalizarNome(nome.value); erros.value.nome = checarNome(nome.value) }
function blurEmail() { email.value = String(email.value || '').trim().toLowerCase(); erros.value.email = checarEmail(email.value) }
function blurWhats() { erros.value.telefone = checarWhats(telefone.value, { obrigatorio: true }) }
function onTelefoneInput(v) {
  telefone.value = mascararTelefone(v)
  erros.value.telefone = ''
}

function escolherArea(op) { area.value = op; erros.value.area = '' }
function escolherFaturamento(op) { faturamento.value = op; erros.value.faturamento = '' }

function validarTudo() {
  const e = {
    nome: checarNome(nome.value),
    email: checarEmail(email.value),
    telefone: checarWhats(telefone.value, { obrigatorio: true }),
    area: area.value ? '' : 'Escolha uma opção.',
    faturamento: faturamento.value ? '' : 'Escolha uma opção.',
  }
  erros.value = e
  return !Object.values(e).some(Boolean)
}

/**
 * criarAcesso — mesmo contrato da Pesquisa (signUpComPesquisa /
 * entrarComPesquisaExistente / retry de submitSurvey em surveyPending),
 * só que com o payload curto (area + faturamento). O merge de `answers`
 * que preserva as 4 respostas abertas de quem já respondeu a pesquisa
 * longa vive em submitSurvey (src/data/api.js).
 */
async function criarAcesso() {
  if (enviando.value) return   // guarda de duplo-submit
  erro.value = ''
  if (!validarTudo()) {
    erro.value = 'Confira os campos destacados.'
    return
  }

  enviando.value = true
  const nomeNormalizado = normalizarNome(nome.value)
  const emailNormalizado = email.value.trim().toLowerCase()
  const telefoneDigitos = telefone.value.replace(/\D/g, '')
  const answers = { area: area.value, faturamento: faturamento.value }

  const r = await signUpComPesquisa({
    email: emailNormalizado,
    nome: nomeNormalizado,
    telefone: telefoneDigitos,
    answers,
  })

  if (!r.ok) {
    if (r.code === 'EXISTS') {
      const re = await entrarComPesquisaExistente({
        email: emailNormalizado,
        answers,
        nome: nomeNormalizado,
        telefone: telefoneDigitos,
      })
      if (!re.ok) {
        enviando.value = false
        if (re.code === 'RATE_LIMIT') {
          erro.value = 'Muitas tentativas com esse e-mail. Aguarde alguns minutos e tente novamente.'
        } else if (re.code === 'ADMIN_PRECISA_SENHA') {
          erro.value = 'Este e-mail é de uma conta administrativa — use o acesso interno.'
        } else {
          erro.value = 'Não foi possível liberar o seu acesso agora. Tente novamente em instantes.'
        }
        return
      }
      if (re.surveyPending) {
        const retry = await submitSurvey(emailNormalizado, answers, nomeNormalizado, telefoneDigitos)
        if (!retry?.ok) {
          enviando.value = false
          erro.value = 'Seu acesso já existe, mas não conseguimos salvar os dados agora. Tente novamente em instantes.'
          return
        }
      }
      enviando.value = false
      router.push({ name: 'ambiente' })
      return
    }
    enviando.value = false
    erro.value = 'Não foi possível criar o seu acesso agora. Tente novamente em instantes.'
    return
  }

  // sucesso → se o insert da pesquisa falhou no signUp (rede etc.), retenta
  // 1x aqui; senão o aluno cai no gate requiresSurvey e é jogado na
  // pesquisa de 9 telas — exatamente o oposto do registro curto.
  if (r.surveyPending) {
    const retry = await submitSurvey(r.email, answers, nomeNormalizado, telefoneDigitos)
    if (!retry?.ok) {
      enviando.value = false
      erro.value = 'Seu acesso foi criado, mas não conseguimos salvar os dados agora. Tente novamente em instantes.'
      return
    }
  }
  enviando.value = false
  router.push({ name: 'ambiente' })
}

const nomeRef = ref(null)
onMounted(() => { if (!nome.value) nomeRef.value?.focus() })
</script>

<template>
  <div class="wrap">
    <header class="top">
      <LogoCNHF :height="34" />
    </header>

    <div class="card box">
      <div class="eyebrow">Criar meu acesso</div>
      <h1>Crie o seu acesso ao workbook</h1>
      <p class="muted sub">Leva menos de 1 minuto — assim que enviar, seu ambiente já é liberado.</p>

      <form @submit.prevent="criarAcesso" class="form" novalidate>
        <label class="field" for="reg-nome">
          <span>Nome completo</span>
          <input
            id="reg-nome" ref="nomeRef" type="text" v-model="nome"
            placeholder="Seu nome completo" autocomplete="name"
            :class="{ invalido: erros.nome }" :aria-invalid="!!erros.nome"
            aria-describedby="reg-nome-erro"
            @input="limparErroCampo('nome')" @blur="blurNome" :disabled="enviando"
          />
          <small id="reg-nome-erro" class="erro-campo" aria-live="polite">{{ erros.nome }}</small>
        </label>

        <label class="field" for="reg-email">
          <span>E-mail</span>
          <input
            id="reg-email" type="email" v-model="email"
            placeholder="voce@email.com" autocomplete="email" inputmode="email"
            :class="{ invalido: erros.email }" :aria-invalid="!!erros.email"
            aria-describedby="reg-email-erro"
            @input="limparErroCampo('email')" @blur="blurEmail" :disabled="enviando"
          />
          <small id="reg-email-erro" class="erro-campo" aria-live="polite">{{ erros.email }}</small>
        </label>

        <label class="field" for="reg-tel">
          <span>WhatsApp</span>
          <input
            id="reg-tel" type="tel" :value="telefone"
            placeholder="(11) 99999-9999" autocomplete="tel" inputmode="numeric"
            :class="{ invalido: erros.telefone }" :aria-invalid="!!erros.telefone"
            aria-describedby="reg-tel-erro"
            @input="onTelefoneInput($event.target.value)" @blur="blurWhats" :disabled="enviando"
          />
          <small id="reg-tel-erro" class="erro-campo" aria-live="polite">{{ erros.telefone }}</small>
        </label>

        <div class="field" role="group" :aria-label="QTD_AREA?.label" aria-describedby="reg-area-erro">
          <span>{{ QTD_AREA?.label }}</span>
          <div class="opcoes">
            <button
              v-for="op in QTD_AREA?.opcoes" :key="op" type="button"
              class="op" :class="{ sel: area === op }" :aria-pressed="area === op"
              :disabled="enviando" @click="escolherArea(op)"
            >{{ op }}</button>
          </div>
          <small id="reg-area-erro" class="erro-campo" aria-live="polite">{{ erros.area }}</small>
        </div>

        <div class="field" role="group" :aria-label="QTD_FATURAMENTO?.label" aria-describedby="reg-fat-erro">
          <span>{{ QTD_FATURAMENTO?.label }}</span>
          <div class="opcoes">
            <button
              v-for="op in QTD_FATURAMENTO?.opcoes" :key="op" type="button"
              class="op" :class="{ sel: faturamento === op }" :aria-pressed="faturamento === op"
              :disabled="enviando" @click="escolherFaturamento(op)"
            >{{ op }}</button>
          </div>
          <small id="reg-fat-erro" class="erro-campo" aria-live="polite">{{ erros.faturamento }}</small>
        </div>

        <div v-if="erro" class="alert bad" role="alert" aria-live="polite">{{ erro }}</div>

        <button type="submit" class="btn primary block" :disabled="enviando">
          {{ enviando ? 'Criando acesso...' : 'Criar meu acesso' }}
        </button>
      </form>

      <div class="rodape">
        <router-link class="link" :to="{ name: 'login' }">Já tenho acesso — entrar</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wrap { position: relative; z-index: 1; max-width: 520px; margin: 0 auto; padding: 28px 18px 60px; }
.top { display: flex; align-items: center; justify-content: center; color: var(--ink); margin-bottom: 22px; }
.box { padding: 32px 34px; }
@media (max-width: 480px) { .box { padding: 24px 20px; } }

h1 { text-align: center; margin: 4px 0 2px; font-size: 24px; }
.sub { text-align: center; margin: 0 0 20px; font-size: 14px; }
.form { display: flex; flex-direction: column; gap: 16px; }

.opcoes { display: flex; flex-direction: column; gap: 9px; margin-top: 4px; }
.op {
  text-align: left; font: inherit; font-size: 14.5px; color: var(--ink);
  padding: 13px 16px; border: 1px solid var(--stroke-strong); border-radius: var(--radius-sm);
  background: var(--surface); cursor: pointer;
  transition: border-color .14s, background .14s, transform .08s, box-shadow .14s;
}
.op:hover { border-color: var(--accent-line); box-shadow: 0 2px 12px rgba(235,115,0,.07); }
.op:active { transform: scale(.99); }
.op.sel { border-color: var(--accent); background: var(--accent-soft); font-weight: 600; box-shadow: 0 0 0 3px var(--accent-soft); }
.op:disabled { opacity: .6; cursor: not-allowed; }

.erro-campo { color: var(--bad-text, #b02c17); font-size: 12.5px; font-weight: 600; margin-top: 2px; display: block; }
.erro-campo:empty { display: none; }

.rodape { text-align: center; margin-top: 16px; }
</style>
