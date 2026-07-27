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
import Eye from '@lucide/vue/dist/esm/icons/eye.mjs'
import EyeOff from '@lucide/vue/dist/esm/icons/eye-off.mjs'
import { recuperarAcesso } from '../data/api.js'

// Canal de suporte para quem trocou de número (preencher quando a equipe
// definir o link — ex.: 'https://wa.me/55...'). Vazio → orientação em texto.
// Canal de socorro para quem trocou de número e não consegue mais recuperar
// sozinho. Configurável por ambiente (ex.: VITE_LINK_SUPORTE=https://wa.me/55...)
// para não exigir mudança de código. Vazio = mostra orientação sem link, nunca
// deixa o aluno num beco sem saída.
const LINK_SUPORTE = import.meta.env.VITE_LINK_SUPORTE || ''

const router = useRouter()

const email = ref('')
const telefone = ref('')
const senha = ref('')
const verSenha = ref(false)
const erros = ref({ email: '', telefone: '', senha: '' })
const falha = ref('')          // '' | 'DADOS' | 'RATE_LIMIT' | 'CONFIG' | 'NETWORK'
const aguardeMin = ref(15)     // minutos sugeridos no rate limit (Retry-After)
const enviando = ref(false)

const emailRef = ref(null)
onMounted(() => emailRef.value?.focus())

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

const checarEmail = () => {
  const e = String(email.value || '').trim().toLowerCase()
  if (!e) return 'Informe o e-mail do seu cadastro.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return 'Informe um e-mail válido (ex.: nome@email.com).'
  return ''
}
const checarTelefone = () => {
  const d = String(telefone.value || '').replace(/\D/g, '')
  if (!d) return 'Informe o WhatsApp do seu cadastro.'
  if (d.length < 10 || d.length > 11) return 'Informe o DDD + número completo.'
  return ''
}
const checarSenha = () => {
  if (!senha.value) return 'Crie a sua nova senha.'
  if (senha.value.length < 8) return 'A nova senha precisa ter pelo menos 8 caracteres.'
  return ''
}

async function recuperar() {
  falha.value = ''
  erros.value = { email: checarEmail(), telefone: checarTelefone(), senha: checarSenha() }
  if (erros.value.email || erros.value.telefone || erros.value.senha) return

  enviando.value = true
  // A resposta do servidor é uniforme; recuperarAcesso descobre o resultado
  // real tentando o login com a senha nova e, em sucesso, JÁ deixa logado.
  const r = await recuperarAcesso({
    email: email.value.trim().toLowerCase(),
    telefone: telefone.value.replace(/\D/g, ''),
    senha: senha.value,
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
  else falha.value = 'DADOS'   // NO_MATCH e INVALID: mensagem única (sem oráculo)
}
</script>

<template>
  <div class="auth">
    <div class="card box">
      <div class="brand"><LogoCNHF :height="44" /></div>
      <div class="eyebrow" style="text-align:center">Ambiente do aluno</div>
      <h1>Recuperar meu acesso</h1>
      <p class="muted sub">
        Sem e-mail de confirmação, sem espera: confirme o e-mail e o WhatsApp
        que você informou na inscrição e crie uma senha nova agora.
      </p>

      <form class="form" novalidate @submit.prevent="recuperar">
        <label class="field" for="rec-email">
          <span>E-mail do cadastro</span>
          <input
            id="rec-email" ref="emailRef" type="email" v-model="email"
            placeholder="voce@email.com" autocomplete="email" inputmode="email"
            :class="{ invalido: erros.email }" :aria-invalid="!!erros.email"
            aria-describedby="rec-email-erro"
            @input="erros.email = ''" @blur="erros.email = checarEmail()"
          />
          <small id="rec-email-erro" class="erro-campo" aria-live="polite">{{ erros.email }}</small>
        </label>

        <label class="field" for="rec-tel">
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

        <label class="field" for="rec-senha">
          <span>Nova senha</span>
          <span class="senha-wrap">
            <input
              id="rec-senha" :type="verSenha ? 'text' : 'password'" v-model="senha"
              placeholder="mínimo 8 caracteres" autocomplete="new-password"
              :class="{ invalido: erros.senha }" :aria-invalid="!!erros.senha"
              aria-describedby="rec-senha-erro"
              @input="erros.senha = ''" @blur="erros.senha = checarSenha()"
            />
            <button
              type="button" class="olho"
              :aria-label="verSenha ? 'Ocultar senha' : 'Mostrar senha'"
              :aria-pressed="verSenha" @click.prevent="verSenha = !verSenha"
            >
              <component :is="verSenha ? EyeOff : Eye" :size="18" :stroke-width="2" aria-hidden="true" />
            </button>
          </span>
          <small id="rec-senha-erro" class="erro-campo" aria-live="polite">{{ erros.senha }}</small>
        </label>

        <div v-if="falha === 'DADOS'" class="alert bad" role="alert">
          <strong>E-mail e WhatsApp não conferem com o cadastro.</strong>
          Confira se são os mesmos que você informou na inscrição — se você tem
          mais de um número, vale tentar o outro.
          <template v-if="LINK_SUPORTE">
            Trocou de número? <a class="link" :href="LINK_SUPORTE" target="_blank" rel="noopener">Fale com o suporte</a>
            para atualizar o seu cadastro.
          </template>
          <template v-else>
            Trocou de número? Fale com a equipe do curso no canal da sua turma
            para atualizar o seu cadastro.
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
          {{ enviando ? 'Verificando...' : 'Criar nova senha e entrar' }}
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
</style>
