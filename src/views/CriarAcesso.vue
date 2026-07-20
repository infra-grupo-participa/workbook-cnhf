<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import LogoCNHF from '../components/LogoCNHF.vue'
import { signUpConvite } from '../data/api.js'

const router = useRouter()

const nome = ref('')
const email = ref('')
const profissao = ref('')
const senha = ref('')
const conf = ref('')
const erro = ref('')
const carregando = ref(false)
const feito = ref(false)
const precisaConfirmar = ref(false)

const PROFISSOES = ['Advogado(a)', 'Contador(a)', 'Outra']

async function criar() {
  erro.value = ''
  if (!nome.value.trim()) { erro.value = 'Informe o seu nome.'; return }
  if (senha.value.length < 8) { erro.value = 'A senha precisa ter pelo menos 8 caracteres.'; return }
  if (senha.value !== conf.value) { erro.value = 'As senhas não conferem.'; return }

  carregando.value = true
  const r = await signUpConvite({
    email: email.value,
    nome: nome.value,
    senha: senha.value,
    profissao: profissao.value || null,
  })
  carregando.value = false

  if (!r.ok) {
    erro.value = r.code === 'EXISTS'
      ? 'Já existe um acesso com esse e-mail. Vá para o login ou use "Esqueci minha senha".'
      : 'Não foi possível criar o acesso agora. Tente novamente em instantes.'
    return
  }

  feito.value = true
  precisaConfirmar.value = r.needsConfirm
  if (!r.needsConfirm) {
    // já logado → cai na pesquisa (trava do ambiente)
    setTimeout(() => router.push({ name: 'pesquisa', query: { motivo: 'trava' } }), 900)
  }
}
</script>

<template>
  <div class="auth">
    <div class="card box">
      <div class="brand"><LogoCNHF :height="44" /></div>
      <div class="eyebrow" style="text-align:center">Ambiente do aluno</div>
      <h1>Criar meu acesso</h1>
      <p class="muted sub">Crie o seu acesso ao workbook do Curso Nacional de Formação em Holding Familiar.</p>

      <template v-if="!feito">
        <form @submit.prevent="criar" class="form">
          <label class="field">
            <span>Nome completo</span>
            <input type="text" v-model="nome" placeholder="Seu nome" autocomplete="name" required />
          </label>
          <label class="field">
            <span>E-mail</span>
            <input type="email" v-model="email" placeholder="voce@email.com" autocomplete="email" required />
          </label>
          <label class="field">
            <span>Profissão</span>
            <select v-model="profissao">
              <option value="">Selecione...</option>
              <option v-for="p in PROFISSOES" :key="p" :value="p">{{ p }}</option>
            </select>
          </label>
          <label class="field">
            <span>Criar senha</span>
            <input type="password" v-model="senha" placeholder="mínimo 8 caracteres" autocomplete="new-password" required />
          </label>
          <label class="field">
            <span>Confirmar senha</span>
            <input type="password" v-model="conf" autocomplete="new-password" required />
          </label>

          <div v-if="erro" class="alert bad">{{ erro }}</div>

          <button class="btn primary block" :disabled="carregando">
            {{ carregando ? 'Criando acesso...' : 'Criar meu acesso' }}
          </button>
        </form>
      </template>

      <template v-else>
        <div v-if="precisaConfirmar" class="alert ok">
          Enviamos um e-mail de confirmação para <strong>{{ email }}</strong>.
          Confirme para ativar seu acesso e depois faça o login.
        </div>
        <div v-else class="alert ok">Acesso criado! Redirecionando...</div>
      </template>

      <div class="rodape">
        <router-link class="link" :to="{ name: 'login' }">Já tenho acesso · Entrar</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth { position: relative; z-index: 1; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
.box { width: min(460px, 100%); padding: 32px 30px; }
.brand { display: flex; justify-content: center; color: var(--ink); margin-bottom: 16px; }
h1 { text-align: center; margin: 4px 0 2px; font-size: 24px; }
.sub { text-align: center; margin: 0 0 20px; font-size: 14px; }
.form { display: flex; flex-direction: column; gap: 14px; }
.rodape { text-align: center; margin-top: 18px; }
select { font: inherit; }
</style>
