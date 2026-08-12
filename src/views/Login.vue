<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import LogoCNHF from '../components/LogoCNHF.vue'
import { entrar } from '../data/api.js'

const router = useRouter()
const route = useRoute()
const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const erro = ref('')
const codigoErro = ref('')
const carregando = ref(false)

const emailRef = ref(null)
onMounted(() => { if (!email.value) emailRef.value?.focus() })

const podeEnviar = computed(() => !carregando.value)

function limparErro() {
  erro.value = ''
  codigoErro.value = ''
}

async function fazerLogin() {
  erro.value = ''
  codigoErro.value = ''
  carregando.value = true
  const r = await entrar(email.value)
  carregando.value = false
  if (!r.ok) {
    codigoErro.value = r.code
    if (r.code === 'NAO_CADASTRADO') {
      erro.value = 'Não encontramos esse e-mail entre os cadastrados.'
    } else if (r.code === 'ADMIN_PRECISA_SENHA') {
      erro.value = 'Esta é uma conta administrativa.'
    } else if (r.code === 'RATE_LIMIT') {
      erro.value = 'Muitas tentativas. Aguarde um pouco e tente novamente.'
    } else if (r.code === 'INVALID') {
      erro.value = r.mensagem || 'Digite um e-mail válido para continuar.'
    } else {
      erro.value = 'Não foi possível entrar agora. O problema não é com o seu e-mail — tente novamente em instantes.'
    }
    return
  }
  // trava da pesquisa: sem pesquisa respondida, não libera o ambiente
  if (!r.surveyDone) {
    router.push({ name: 'pesquisa', query: { motivo: 'trava' } })
  } else {
    router.push(route.query.proximo || { name: 'ambiente' })
  }
}
</script>

<template>
  <div class="auth">
    <div class="card box">
      <div class="brand"><LogoCNHF :height="46" /></div>
      <div class="eyebrow" style="text-align:center">Ambiente do aluno</div>
      <h1>Entrar no workbook</h1>
      <p class="muted sub">Use o mesmo e-mail com que você se inscreveu no curso.</p>

      <form @submit.prevent="fazerLogin" class="form" novalidate>
        <label class="field" for="login-email">
          <span>E-mail</span>
          <input
            id="login-email" ref="emailRef" type="email" v-model="email"
            placeholder="voce@email.com" autocomplete="email" inputmode="email"
            required @input="limparErro" :disabled="carregando"
          />
        </label>

        <div v-if="erro" class="alert bad" role="alert">{{ erro }}</div>

        <router-link
          v-if="codigoErro === 'NAO_CADASTRADO'"
          class="btn primary block" :to="{ name: 'pesquisa' }"
        >
          Responder a pesquisa e liberar meu acesso
        </router-link>
        <button v-else class="btn primary block" :disabled="!podeEnviar">
          {{ carregando ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>

      <p v-if="codigoErro === 'NAO_CADASTRADO'" class="ajuda muted">
        Ao responder a pesquisa rápida, o seu acesso ao workbook é liberado no final.
      </p>

      <div class="rodape">
        <router-link class="link" :to="{ name: 'pesquisa' }">Ainda não tenho acesso</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth { position: relative; z-index: 1; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
.box { width: min(440px, 100%); padding: 32px 30px; }
@media (max-width: 420px) { .box { padding: 26px 20px; } }
.brand { display: flex; justify-content: center; color: var(--ink); margin-bottom: 18px; }
h1 { text-align: center; margin: 4px 0 2px; font-size: 24px; }
.sub { text-align: center; margin: 0 0 20px; font-size: 14px; }
.form { display: flex; flex-direction: column; gap: 14px; }
.rodape { text-align: center; margin-top: 16px; display: flex; gap: 8px; justify-content: center; align-items: center; flex-wrap: wrap; }
.sep { color: var(--ink-2); }

.ajuda { text-align: center; font-size: 12.5px; line-height: 1.5; margin: 10px 0 0; }
</style>
