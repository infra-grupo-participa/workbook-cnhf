<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import LogoCNHF from '../components/LogoCNHF.vue'
import { login } from '../data/api.js'

const router = useRouter()
const route = useRoute()
const email = ref('')
const senha = ref('')
const erro = ref('')
const carregando = ref(false)

async function entrar() {
  erro.value = ''
  carregando.value = true
  const r = await login(email.value, senha.value)
  carregando.value = false
  if (!r.ok) {
    erro.value = r.code === 'NOT_REGISTERED'
      ? 'Não encontramos esse e-mail no cadastro do lançamento. Use o mesmo e-mail que você usou para se inscrever.'
      : 'E-mail ou senha incorretos. Se precisar, use "Esqueci minha senha".'
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

      <form @submit.prevent="entrar" class="form">
        <label class="field">
          <span>E-mail</span>
          <input type="email" v-model="email" placeholder="voce@email.com" autocomplete="email" required />
        </label>
        <label class="field">
          <span>Senha</span>
          <input type="password" v-model="senha" placeholder="sua senha" autocomplete="current-password" required />
        </label>

        <div v-if="erro" class="alert bad">{{ erro }}</div>

        <button class="btn primary block" :disabled="carregando">
          {{ carregando ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>

      <div class="rodape">
        <router-link class="link" :to="{ name: 'esqueci' }">Esqueci minha senha</router-link>
        <span class="sep">·</span>
        <router-link class="link" :to="{ name: 'criar-acesso' }">Criar meu acesso</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth { position: relative; z-index: 1; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
.box { width: min(440px, 100%); padding: 32px 30px; }
.brand { display: flex; justify-content: center; color: var(--ink); margin-bottom: 18px; }
h1 { text-align: center; margin: 4px 0 2px; font-size: 24px; }
.sub { text-align: center; margin: 0 0 20px; font-size: 14px; }
.form { display: flex; flex-direction: column; gap: 14px; }
.rodape { text-align: center; margin-top: 16px; display: flex; gap: 8px; justify-content: center; align-items: center; flex-wrap: wrap; }
.sep { color: var(--ink-2); }
</style>
