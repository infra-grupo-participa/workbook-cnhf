<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LogoCNHF from '../components/LogoCNHF.vue'
import { resetPassword } from '../data/api.js'

const route = useRoute()
const router = useRouter()
const nova = ref('')
const conf = ref('')
const erro = ref('')
const ok = ref(false)

async function salvar() {
  erro.value = ''
  if (nova.value.length < 8) { erro.value = 'A senha precisa ter pelo menos 8 caracteres.'; return }
  if (nova.value !== conf.value) { erro.value = 'As senhas não conferem.'; return }
  const r = await resetPassword(route.query.token, nova.value)
  if (!r.ok) { erro.value = 'Link inválido ou expirado. Solicite um novo.'; return }
  ok.value = true
  setTimeout(() => router.push({ name: 'login' }), 1600)
}
</script>

<template>
  <div class="auth">
    <div class="card box">
      <div class="brand"><LogoCNHF :height="42" /></div>
      <h1>Criar nova senha</h1>
      <template v-if="!ok">
        <form @submit.prevent="salvar" class="form">
          <label class="field"><span>Nova senha</span><input type="password" v-model="nova" placeholder="mínimo 8 caracteres" required /></label>
          <label class="field"><span>Confirmar nova senha</span><input type="password" v-model="conf" required /></label>
          <div v-if="erro" class="alert bad">{{ erro }}</div>
          <button class="btn primary block">Salvar nova senha</button>
        </form>
      </template>
      <div v-else class="alert ok">Senha atualizada! Redirecionando para o login...</div>
    </div>
  </div>
</template>

<style scoped>
.auth { position: relative; z-index: 1; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
.box { width: min(440px, 100%); padding: 32px 30px; }
.brand { display: flex; justify-content: center; color: var(--ink); margin-bottom: 14px; }
h1 { text-align: center; margin: 4px 0 18px; font-size: 22px; }
.form { display: flex; flex-direction: column; gap: 14px; }
</style>
