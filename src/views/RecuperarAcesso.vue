<script setup>
/* ============================================================
   RECUPERAR ACESSO — sem e-mail, numa tela só (decisão do João).
   E-mail + WhatsApp do cadastro + senha nova → POST /api/recuperar-acesso
   (contrato em tmp/squad/extra-workbook.md).

   A resposta do servidor é UNIFORME de propósito: nunca dizemos se o
   e-mail existe ou se o telefone bateu (oráculo de enumeração da base
   de leads). O front descobre o sucesso tentando LOGAR com a senha
   nova — se entrar, deu certo; se não, mostra a orientação única.
   ============================================================ */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import LogoCNHF from '../components/LogoCNHF.vue'
import { entrar } from '../data/api.js'

// Canal de suporte para quem trocou de número (preencher quando a equipe
// definir o link — ex.: 'https://wa.me/55...'). Vazio → orientação em texto.
// Canal de socorro para quem trocou de número e não consegue mais recuperar
// sozinho. Configurável por ambiente (ex.: VITE_LINK_SUPORTE=https://wa.me/55...)
// para não exigir mudança de código. Vazio = mostra orientação sem link, nunca
// deixa o aluno num beco sem saída.
const LINK_SUPORTE = import.meta.env.VITE_LINK_SUPORTE || ''

const router = useRouter()

// Opções da pesquisa usadas como prova de identidade no 2º caminho. Precisam
// bater com survey-schema.js (contrato com dashboard/health/CRM — não mudar aqui).
const OPCOES_FATURAMENTO = ['Até R$ 5 mil', 'R$ 5 a 15 mil', 'R$ 15 a 30 mil', 'Acima de R$ 30 mil']
const OPCOES_AREA = ['Advocacia', 'Contabilidade', 'Outra']

// método de recuperação: 'telefone' (padrão) ou 'dados' (não lembra o WhatsApp)
const metodo = ref('telefone')

const email = ref('')
const telefone = ref('')
const nome = ref('')
const faturamento = ref('')
const area = ref('')
const erros = ref({ email: '', telefone: '', nome: '', faturamento: '', area: '', senha: '' })
const falha = ref('')          // '' | 'DADOS' | 'ORIENTACAO' | 'RATE_LIMIT' | 'CONFIG' | 'NETWORK'
const orientacao = ref('')     // mensagem vinda do servidor (AMBIGUO / PRECISA_EMAIL)
const aguardeMin = ref(15)     // minutos sugeridos no rate limit (Retry-After)
const enviando = ref(false)

const emailRef = ref(null)
onMounted(() => emailRef.value?.focus())

function trocarMetodo(m) {
  metodo.value = m
  falha.value = ''
  erros.value = { email: '', telefone: '', nome: '', faturamento: '', area: '', senha: '' }
}

// --- máscara de telefone: digitação vira (XX) XXXXX-XXXX; colagem em
// qualquer formato é aceita (+55, espaços, pontos) — o +55 é descartado
// aqui só para a exibição; o SERVIDOR normaliza de verdade.
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

// O 1º campo aceita e-mail OU WhatsApp — o aluno usa o que lembrar.
const checarEmail = () => {
  const v = String(email.value || '').trim()
  if (!v) return 'Informe o e-mail ou o WhatsApp do seu cadastro.'
  if (v.includes('@')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.toLowerCase())
      ? '' : 'Informe um e-mail válido (ex.: nome@email.com).'
  }
  const d = v.replace(/\D/g, '')
  if (d.length < 10 || d.length > 13) return 'Informe um e-mail válido ou o WhatsApp com DDD.'
  return ''
}
const checarTelefone = () => {
  const d = String(telefone.value || '').replace(/\D/g, '')
  if (!d) return 'Informe o WhatsApp do seu cadastro.'
  if (d.length < 10 || d.length > 11) return 'Informe o DDD + número completo.'
  return ''
}
const checarNome = () => {
  const n = String(nome.value || '').trim()
  if (!n) return 'Informe o seu nome completo.'
  if (n.split(/\s+/).filter(Boolean).length < 2) return 'Informe nome e sobrenome, como no cadastro.'
  return ''
}
const checarFaturamento = () => (faturamento.value ? '' : 'Selecione a faixa que você informou.')
const checarArea = () => (area.value ? '' : 'Selecione a sua profissão.')

async function recuperar() {
  falha.value = ''
  const porDados = metodo.value === 'dados'
  erros.value = {
    email: checarEmail(),
    telefone: porDados ? '' : checarTelefone(),
    nome: porDados ? checarNome() : '',
    faturamento: porDados ? checarFaturamento() : '',
    area: porDados ? checarArea() : '',
    senha: '',   // SEM SENHA: o aluno entra provando identidade (2026-08-10)
  }
  if (erros.value.email || erros.value.telefone || erros.value.nome ||
      erros.value.faturamento || erros.value.area) return

  enviando.value = true
  // entrar() prova a identidade no servidor e troca o magic link por sessão.
  const r = await entrar(porDados
    ? {
        modo: 'dados',
        identificador: email.value.trim(),
        nome: nome.value.trim(),
        faturamento: faturamento.value,
        area: area.value,
      }
    : {
        identificador: email.value.trim(),
        telefone: telefone.value.replace(/\D/g, ''),
      })
  enviando.value = false

  if (r.ok) {
    if (!r.surveyDone) router.push({ name: 'pesquisa', query: { motivo: 'trava' } })
    else router.push({ name: 'ambiente' })
    return
  }
  if (r.code === 'RATE_LIMIT') {
    aguardeMin.value = Math.max(1, Math.ceil((r.retryAfterSeg || 900) / 60))
    falha.value = 'RATE_LIMIT'
  } else if (r.code === 'CONFIG') falha.value = 'CONFIG'
  else if (r.code === 'NETWORK') falha.value = 'NETWORK'
  else if (r.code === 'AMBIGUO' || r.code === 'PRECISA_EMAIL') {
    // orientação específica do servidor (WhatsApp repetido / falta 2º dado)
    orientacao.value = r.mensagem || ''
    falha.value = 'ORIENTACAO'
  } else falha.value = 'DADOS'
}
</script>

<template>
  <div class="auth">
    <div class="card box">
      <div class="brand"><LogoCNHF :height="44" /></div>
      <div class="eyebrow" style="text-align:center">Ambiente do aluno</div>
      <h1>Entrar no meu workbook</h1>
      <p class="muted sub">
        <template v-if="metodo === 'telefone'">
          Você não precisa de senha. Confirme o e-mail e o WhatsApp que informou
          na inscrição e entre direto.
        </template>
        <template v-else>
          Não lembra o WhatsApp? Sem problema. Confirme o e-mail e alguns dados
          que você respondeu na inscrição e entre direto.
        </template>
      </p>

      <div class="metodos" role="tablist" aria-label="Como recuperar o acesso">
        <button
          type="button" class="metodo" role="tab" :aria-selected="metodo === 'telefone'"
          :class="{ ativo: metodo === 'telefone' }" @click="trocarMetodo('telefone')"
        >Tenho o WhatsApp</button>
        <button
          type="button" class="metodo" role="tab" :aria-selected="metodo === 'dados'"
          :class="{ ativo: metodo === 'dados' }" @click="trocarMetodo('dados')"
        >Não lembro o WhatsApp</button>
      </div>

      <form class="form" novalidate @submit.prevent="recuperar">
        <label class="field" for="rec-email">
          <span>E-mail ou WhatsApp do cadastro</span>
          <input
            id="rec-email" ref="emailRef" type="text" v-model="email"
            placeholder="voce@email.com ou (11) 98888-7777" autocomplete="email"
            :class="{ invalido: erros.email }" :aria-invalid="!!erros.email"
            aria-describedby="rec-email-erro"
            @input="erros.email = ''" @blur="erros.email = checarEmail()"
          />
          <small id="rec-email-erro" class="erro-campo" aria-live="polite">{{ erros.email }}</small>
        </label>

        <label v-if="metodo === 'telefone'" class="field" for="rec-tel">
          <span>WhatsApp do cadastro</span>
          <input
            id="rec-tel" type="tel" :value="telefone"
            placeholder="(11) 99999-9999" autocomplete="tel" inputmode="numeric"
            :class="{ invalido: erros.telefone }" :aria-invalid="!!erros.telefone"
            aria-describedby="rec-tel-ajuda rec-tel-erro"
            @input="telefone = mascararTelefone($event.target.value); erros.telefone = ''"
            @blur="erros.telefone = checarTelefone()"
          />
          <small id="rec-tel-ajuda" class="ajuda-campo muted">O mesmo número que você informou ao responder a pesquisa.</small>
          <small id="rec-tel-erro" class="erro-campo" aria-live="polite">{{ erros.telefone }}</small>
        </label>

        <template v-else>
          <label class="field" for="rec-nome">
            <span>Nome completo</span>
            <input
              id="rec-nome" type="text" v-model="nome"
              placeholder="Como você se inscreveu" autocomplete="name"
              :class="{ invalido: erros.nome }" :aria-invalid="!!erros.nome"
              aria-describedby="rec-nome-erro"
              @input="erros.nome = ''" @blur="erros.nome = checarNome()"
            />
            <small id="rec-nome-erro" class="erro-campo" aria-live="polite">{{ erros.nome }}</small>
          </label>

          <label class="field" for="rec-area">
            <span>Sua profissão</span>
            <select
              id="rec-area" v-model="area"
              :class="{ invalido: erros.area }" :aria-invalid="!!erros.area"
              aria-describedby="rec-area-erro" @change="erros.area = ''"
            >
              <option value="" disabled>Selecione…</option>
              <option v-for="op in OPCOES_AREA" :key="op" :value="op">{{ op }}</option>
            </select>
            <small id="rec-area-erro" class="erro-campo" aria-live="polite">{{ erros.area }}</small>
          </label>

          <label class="field" for="rec-fat">
            <span>Faturamento mensal informado</span>
            <select
              id="rec-fat" v-model="faturamento"
              :class="{ invalido: erros.faturamento }" :aria-invalid="!!erros.faturamento"
              aria-describedby="rec-fat-ajuda rec-fat-erro" @change="erros.faturamento = ''"
            >
              <option value="" disabled>Selecione…</option>
              <option v-for="op in OPCOES_FATURAMENTO" :key="op" :value="op">{{ op }}</option>
            </select>
            <small id="rec-fat-ajuda" class="ajuda-campo muted">A mesma faixa que você marcou na pesquisa de inscrição.</small>
            <small id="rec-fat-erro" class="erro-campo" aria-live="polite">{{ erros.faturamento }}</small>
          </label>
        </template>

        <div v-if="falha === 'ORIENTACAO'" class="alert warn" role="alert">
          {{ orientacao }}
        </div>
        <div v-else-if="falha === 'DADOS' && metodo === 'telefone'" class="alert bad" role="alert">
          <strong>E-mail e WhatsApp não conferem com o cadastro.</strong>
          Confira se são os mesmos que você informou na inscrição — se você tem
          mais de um número, vale tentar o outro. Não lembra o número?
          <button type="button" class="link comolink" @click="trocarMetodo('dados')">
            Recupere pelos seus dados da inscrição.
          </button>
        </div>
        <div v-else-if="falha === 'DADOS' && metodo === 'dados'" class="alert bad" role="alert">
          <strong>Os dados não conferem com o seu cadastro.</strong>
          Confira o e-mail, o nome completo (como se inscreveu), a profissão e a
          faixa de faturamento que você marcou na pesquisa.
          <template v-if="LINK_SUPORTE">
            Ainda sem sucesso? <a class="link" :href="LINK_SUPORTE" target="_blank" rel="noopener">Fale com o suporte</a>.
          </template>
          <template v-else>
            Ainda sem sucesso? Fale com a equipe do curso no canal da sua turma.
          </template>
        </div>
        <div v-else-if="falha === 'RATE_LIMIT'" class="alert warn" role="alert">
          Muitas tentativas em pouco tempo. Por segurança, a recuperação fica
          pausada — respire, confira os dados e tente de novo em
          {{ aguardeMin === 1 ? '1 minuto' : `uns ${aguardeMin} minutos` }}.
        </div>
        <div v-else-if="falha === 'CONFIG'" class="alert bad" role="alert">
          A recuperação está temporariamente indisponível — não é nada com os
          seus dados. Tente mais tarde ou fale com a equipe do curso.
        </div>
        <div v-else-if="falha === 'NETWORK'" class="alert bad" role="alert">
          Não conseguimos falar com o servidor agora. Verifique a sua conexão e
          tente novamente.
        </div>

        <button class="btn primary block" :disabled="enviando">
          {{ enviando ? 'Verificando...' : 'Entrar' }}
        </button>
      </form>

      <div class="rodape">
        <router-link class="link" :to="{ name: 'login' }">Voltar para o login</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth { position: relative; z-index: 1; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
.box { width: min(460px, 100%); padding: 32px 30px; }
@media (max-width: 420px) { .box { padding: 26px 20px; } }
.brand { display: flex; justify-content: center; color: var(--ink); margin-bottom: 16px; }
h1 { text-align: center; margin: 4px 0 6px; font-size: 23px; }
.sub { text-align: center; margin: 0 0 20px; font-size: 14px; line-height: 1.55; }
.form { display: flex; flex-direction: column; gap: 14px; }
.rodape { text-align: center; margin-top: 18px; }

.ajuda-campo { font-size: 12px; line-height: 1.45; }
/* erro AA nos três temas — token global do F1 (6.5/6.6/9.0:1) */
.erro-campo { color: var(--bad-text, #b02c17); font-size: 12.5px; font-weight: 600; }
.erro-campo:empty { display: none; }

/* campo de senha com alternador mostrar/ocultar (alvo ≥44px) */
.senha-wrap { position: relative; display: block; }
.senha-wrap input { padding-right: 52px; }
.olho {
  position: absolute; top: 50%; right: 4px; transform: translateY(-50%);
  width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center;
  border: none; background: none; color: var(--ink-2); cursor: pointer; border-radius: var(--radius-sm);
}
.olho:hover { color: var(--ink); }

.alert.bad .link { color: inherit; text-decoration: underline; }
/* link textual dentro do alerta (botão que troca o método) */
.comolink {
  border: none; background: none; padding: 0; font: inherit; cursor: pointer;
  color: inherit; text-decoration: underline;
}

/* seletor de método (segmented control) */
.metodos {
  display: flex; gap: 4px; margin: 0 0 18px;
  background: var(--elev-1, rgba(127,127,127,.08));
  border: 1px solid var(--line-soft, rgba(127,127,127,.18));
  border-radius: var(--radius-sm, 10px); padding: 4px;
}
.metodo {
  flex: 1; min-height: 40px; border: none; background: none; cursor: pointer;
  border-radius: calc(var(--radius-sm, 10px) - 3px);
  font-size: 13px; font-weight: 600; color: var(--ink-2);
  transition: background .15s, color .15s;
}
.metodo:hover { color: var(--ink); }
.metodo.ativo {
  background: var(--bg, #fff); color: var(--ink);
  box-shadow: 0 1px 2px rgba(0,0,0,.08);
}
:root[data-theme='dark'] .metodo.ativo { background: rgba(255,255,255,.10); }
</style>
