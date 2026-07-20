<script setup>
import { ref } from 'vue'
import LogoCNHF from '../components/LogoCNHF.vue'
import { requestReset } from '../data/api.js'

const email = ref('')
const erro = ref('')
const enviado = ref(false)

async function enviar() {
  erro.value = ''
  const r = await requestReset(email.value)
  if (!r.ok) {
    erro.value = r.code === 'NOT_REGISTERED'
      ? 'Não encontramos esse e-mail no cadastro do lançamento.'
      : 'Não foi possível enviar o e-mail agora. Tente novamente em instantes.'
    return
  }
  enviado.value = true
}
</script>

<template>
  <div class="auth">
    <div class="card box">
      <div class="brand"><LogoCNHF :height="42" /></div>
      <h1>Redefinir senha</h1>

      <template v-if="!enviado">
        <p class="muted sub">Informe o e-mail da sua inscrição e enviaremos um link para você criar uma nova senha.</p>
        <form @submit.prevent="enviar" class="form">
          <label class="field">
            <span>E-mail</span>
            <input type="email" v-model="email" placeholder="voce@email.com" required />
          </label>
          <div v-if="erro" class="alert bad">{{ erro }}</div>
          <button class="btn primary block">Enviar link de redefinição</button>
        </form>
      </template>

      <template v-else>
        <div class="alert ok">Pronto! Enviamos um link de redefinição para <strong>{{ email }}</strong>. Confira sua caixa de entrada (e o spam).</div>
      </template>

      <div class="rodape">
        <router-link class="link" :to="{ name: 'login' }">Voltar para o login</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth { position: relative; z-index: 1; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
.box { width: min(440px, 100%); padding: 32px 30px; }
.brand { display: flex; justify-content: center; color: var(--ink); margin-bottom: 14px; }
h1 { text-align: center; margin: 4px 0 6px; font-size: 22px; }
.sub { text-align: center; margin: 0 0 18px; font-size: 14px; }
.form { display: flex; flex-direction: column; gap: 14px; }
.rodape { text-align: center; margin-top: 18px; }
</style>
