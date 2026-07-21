<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import LogoCNHF from '../components/LogoCNHF.vue'
import Lock from '@lucide/vue/dist/esm/icons/lock.mjs'
import { currentUser, getLead, logout, changePassword } from '../data/api.js'

const router = useRouter()
const email = currentUser()
const nome = ref('')

onMounted(async () => {
  const l = await getLead(email); nome.value = l?.nome || ''
})

// trocar senha
const abrirSenha = ref(false)
const atual = ref(''); const nova = ref(''); const conf = ref('')
const msg = ref(''); const msgTipo = ref('ok')
async function salvarSenha() {
  msg.value = ''
  if (nova.value.length < 8) { msgTipo.value = 'bad'; msg.value = 'A nova senha precisa ter ao menos 8 caracteres.'; return }
  if (nova.value !== conf.value) { msgTipo.value = 'bad'; msg.value = 'As senhas não conferem.'; return }
  const r = await changePassword(email, atual.value, nova.value)
  if (!r.ok) { msgTipo.value = 'bad'; msg.value = 'Senha atual incorreta.'; return }
  msgTipo.value = 'ok'; msg.value = 'Senha alterada com sucesso.'
  atual.value = nova.value = conf.value = ''
}

function sair() { logout(); router.push({ name: 'login' }) }
</script>

<template>
  <div class="shell">
    <header class="top card">
      <LogoCNHF :height="34" />
      <div class="acts">
        <button class="btn ghost" @click="router.push({ name: 'anotacoes' })">Minhas anotações</button>
        <button class="btn ghost" @click="abrirSenha = !abrirSenha">Trocar senha</button>
        <button class="btn" @click="sair">Sair</button>
      </div>
    </header>

    <section class="hero card">
      <div class="eyebrow">Ambiente do aluno</div>
      <h1>Olá{{ nome ? ', ' + nome.split(' ')[0] : '' }}</h1>
      <p class="muted">Seu acesso ao workbook do Curso Nacional de Formação em Holding Familiar está garantido. Em breve o conteúdo das aulas aparece aqui.</p>
      <div class="tags">
        <span class="tag">100% ao vivo</span><span class="tag">Certificado ao final</span>
      </div>
    </section>

    <div v-if="abrirSenha" class="card senha">
      <div class="eyebrow">Segurança</div>
      <h3>Trocar minha senha</h3>
      <div class="senha-form">
        <label class="field"><span>Senha atual</span><input type="password" v-model="atual" /></label>
        <label class="field"><span>Nova senha</span><input type="password" v-model="nova" /></label>
        <label class="field"><span>Confirmar</span><input type="password" v-model="conf" /></label>
      </div>
      <div v-if="msg" class="alert" :class="msgTipo" style="margin-top:12px">{{ msg }}</div>
      <button class="btn primary" style="margin-top:12px" @click="salvarSenha">Salvar nova senha</button>
    </div>

    <!-- CONTEÚDO EM BREVE — a trilha ainda está sendo preparada -->
    <section class="card soon">
      <div class="lock"><Lock :size="26" :stroke-width="2" /></div>
      <div class="eyebrow">Em breve</div>
      <h2>Sua trilha está sendo preparada</h2>
      <p class="muted">
        Estamos finalizando o conteúdo das aulas do Curso Nacional de Formação em
        Holding Familiar. Assim que a trilha for liberada, todas as aulas, exercícios
        e materiais aparecem aqui, dentro do seu ambiente.
      </p>
      <p class="muted aviso">
        Fique de olho no seu e-mail — vamos te avisar no momento da liberação.
      </p>
      <div class="skeleton">
        <div class="sk-card" v-for="n in 3" :key="n">
          <div class="sk-n">{{ n }}</div>
          <div class="sk-body">
            <div class="sk-line lg" />
            <div class="sk-line" />
          </div>
          <span class="sk-tag">em breve</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.shell { position: relative; z-index: 1; max-width: 900px; margin: 0 auto; padding: 18px 18px 60px; display: flex; flex-direction: column; gap: 16px; }
.top { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; color: var(--ink); }
.acts { display: flex; gap: 8px; }
.hero { padding: 26px 28px; }
.hero h1 { font-size: 26px; margin: 6px 0 8px; }
.hero p { margin: 0; font-size: 14.5px; line-height: 1.6; max-width: 640px; }
.tags { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
.tag { font-size: 12px; font-weight: 700; padding: 5px 12px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); border: 1px solid var(--accent-line); }
.senha { padding: 20px 24px; }
.senha h3 { margin: 4px 0 14px; }
.senha-form { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
@media (max-width: 640px) { .senha-form { grid-template-columns: 1fr; } }

/* bloqueio "em breve" */
.soon { padding: 40px 32px 34px; text-align: center; }
.lock { width: 58px; height: 58px; margin: 0 auto 14px; border-radius: 50%; background: var(--accent-soft); border: 1px solid var(--accent-line); display: grid; place-items: center; color: var(--accent); }
.soon h2 { font-size: 23px; margin: 8px 0 12px; }
.soon p { font-size: 14.5px; line-height: 1.65; max-width: 560px; margin: 0 auto; }
.soon .aviso { margin-top: 10px; font-size: 13.5px; }
.skeleton { margin-top: 28px; display: flex; flex-direction: column; gap: 12px; text-align: left; }
.sk-card { display: flex; align-items: center; gap: 16px; padding: 16px 18px; border: 1px dashed var(--stroke-strong); border-radius: var(--radius-sm); background: var(--surface); opacity: .55; }
.sk-n { flex: none; width: 40px; height: 40px; border-radius: 12px; background: var(--stroke-strong); color: var(--ink-3); font-weight: 900; display: grid; place-items: center; font-size: 18px; }
.sk-body { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.sk-line { height: 10px; border-radius: 999px; background: var(--stroke-strong); width: 55%; }
.sk-line.lg { width: 78%; height: 12px; }
.sk-tag { font-size: 11px; font-weight: 700; color: var(--ink-3); text-transform: uppercase; letter-spacing: .08em; }
</style>
