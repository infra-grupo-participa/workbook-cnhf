<script setup>
import { ref } from 'vue'
import LogoCNHF from '../components/LogoCNHF.vue'
import { requestReset } from '../data/api.js'

const email = ref('')
const erro = ref('')
const enviado = ref(false)
const linkMock = ref('')

async function enviar() {
  erro.value = ''
  const r = await requestReset(email.value)
  if (!r.ok) {
    erro.value = 'Não encontramos esse e-mail no cadastro do lançamento.'
    return
  }
  enviado.value = true
  linkMock.value = r.link // Fase 2: e-mail real via Supabase; no mock mostramos o link
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
        <div class="alert ok">Pronto! Enviamos um link de redefinição para <strong>{{ email }}</strong>. Confira sua caixa de entrada.</div>
        <div class="mock glass">
          <strong>Modo demonstração</strong>
          <span>Como ainda não há e-mail real (isso vem com o Supabase), use o link abaixo:</span>
          <a class="link" :href="linkMock">Abrir link de redefinição</a>
        </div>
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
.mock { margin-top: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; font-size: 12.5px; color: var(--ink-2); }
.mock strong { color: var(--accent); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
</style>
