<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import LogoCNHF from '../components/LogoCNHF.vue'
import { login, isAdmin, logout } from '../data/api.js'

const router = useRouter()
const email = ref('')
const senha = ref('')
const erro = ref('')
const carregando = ref(false)

const emailRef = ref(null)
onMounted(() => emailRef.value?.focus())

const podeEnviar = computed(() => !carregando.value)

async function entrar() {
  erro.value = ''
  carregando.value = true
  const r = await login(email.value, senha.value, { generic: true })
  if (!r.ok) {
    carregando.value = false
    erro.value = 'E-mail ou senha incorretos.'
    return
  }
  // este acesso é exclusivo de admin — qualquer login válido que não seja
  // administrativo é desfeito imediatamente.
  if (!(await isAdmin())) {
    await logout()
    carregando.value = false
    erro.value = 'Este acesso é exclusivo para administradores.'
    return
  }
  carregando.value = false
  router.push({ name: 'resultados' })
}
</script>

<template>
  <div class="auth">
    <div class="card box">
      <div class="brand"><LogoCNHF :height="46" /></div>
      <div class="eyebrow" style="text-align:center">Acesso interno</div>
      <h1>Entrar</h1>

      <form @submit.prevent="entrar" class="form" novalidate>
        <label class="field" for="interno-email">
          <span>E-mail</span>
          <input
            id="interno-email" ref="emailRef" type="email" v-model="email"
            placeholder="voce@email.com" autocomplete="email" inputmode="email"
            required @input="erro = ''" :disabled="carregando"
          />
        </label>
        <label class="field" for="interno-senha">
          <span>Senha</span>
          <input
            id="interno-senha" type="password" v-model="senha"
            placeholder="sua senha" autocomplete="current-password"
            required @input="erro = ''" :disabled="carregando"
          />
        </label>

        <div v-if="erro" class="alert bad" role="alert">{{ erro }}</div>

        <button class="btn primary block" :disabled="!podeEnviar">
          {{ carregando ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.auth { position: relative; z-index: 1; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
.box { width: min(440px, 100%); padding: 32px 30px; }
@media (max-width: 420px) { .box { padding: 26px 20px; } }
.brand { display: flex; justify-content: center; color: var(--ink); margin-bottom: 18px; }
h1 { text-align: center; margin: 4px 0 20px; font-size: 24px; }
.form { display: flex; flex-direction: column; gap: 14px; }
</style>
