<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import LogoCNHF from '../components/LogoCNHF.vue'
import Eye from '@lucide/vue/dist/esm/icons/eye.mjs'
import EyeOff from '@lucide/vue/dist/esm/icons/eye-off.mjs'
import { login } from '../data/api.js'

/* ------------------------------------------------------------
   PENDÊNCIA DE SEGURANÇA (decisão do João, ainda não tomada):
   distinguir "e-mail não cadastrado" de "senha incorreta" permite
   enumerar quem é aluno do curso (insumo para phishing dirigido).
   A correção padrão é a mensagem única abaixo — que piora a UX de
   propósito. Ligar mudando a constante para true.
   ------------------------------------------------------------ */
const MENSAGEM_UNICA_LOGIN = false

const router = useRouter()
const route = useRoute()
const email = ref('')
const senha = ref('')
const verSenha = ref(false)
const erro = ref('')
const carregando = ref(false)

const emailRef = ref(null)
onMounted(() => { if (!email.value) emailRef.value?.focus() })

const podeEnviar = computed(() => !carregando.value)

async function entrar() {
  erro.value = ''
  carregando.value = true
  const r = await login(email.value, senha.value)
  carregando.value = false
  if (!r.ok) {
    if (MENSAGEM_UNICA_LOGIN) {
      erro.value = 'E-mail ou senha incorretos. Se precisar, use "Esqueci minha senha".'
    } else {
      erro.value = r.code === 'NOT_REGISTERED'
        ? 'Não encontramos esse e-mail no cadastro do lançamento. Use o mesmo e-mail que você usou para se inscrever.'
        : 'E-mail ou senha incorretos. Se precisar, use "Esqueci minha senha".'
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

      <form @submit.prevent="entrar" class="form" novalidate>
        <label class="field" for="login-email">
          <span>E-mail</span>
          <input
            id="login-email" ref="emailRef" type="email" v-model="email"
            placeholder="voce@email.com" autocomplete="email" inputmode="email"
            required @input="erro = ''"
          />
        </label>
        <label class="field" for="login-senha">
          <span>Senha</span>
          <span class="senha-wrap">
            <input
              id="login-senha" :type="verSenha ? 'text' : 'password'" v-model="senha"
              placeholder="sua senha" autocomplete="current-password"
              required @input="erro = ''"
            />
            <button
              type="button" class="olho"
              :aria-label="verSenha ? 'Ocultar senha' : 'Mostrar senha'"
              :aria-pressed="verSenha" @click.prevent="verSenha = !verSenha"
            >
              <component :is="verSenha ? EyeOff : Eye" :size="18" :stroke-width="2" aria-hidden="true" />
            </button>
          </span>
        </label>

        <div v-if="erro" class="alert bad" role="alert">{{ erro }}</div>

        <button class="btn primary block" :disabled="!podeEnviar">
          {{ carregando ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>

      <div class="rodape">
        <router-link class="link" :to="{ name: 'recuperar' }">Esqueci minha senha</router-link>
        <span class="sep" aria-hidden="true">·</span>
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

.senha-wrap { position: relative; display: block; }
.senha-wrap input { padding-right: 52px; }
.olho {
  position: absolute; top: 50%; right: 4px; transform: translateY(-50%);
  width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center;
  border: none; background: none; color: var(--ink-2); cursor: pointer; border-radius: var(--radius-sm);
}
.olho:hover { color: var(--ink); }
</style>
