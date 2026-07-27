<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import LogoCNHF from '../components/LogoCNHF.vue'
import { currentUser, getLead, logout, changePassword } from '../data/api.js'
import { store } from '../data/store.js'
import { WORKBOOK } from '../data/workbook-content.js'

const router = useRouter()
const email = currentUser()
const nome = ref('')

// progresso real do aluno (store local-first — funciona offline)
const TOTAL = WORKBOOK.reduce((a, s) => a + s.total_lacunas, 0)
const prontoProg = ref(false)
const pct = computed(() =>
  TOTAL ? Math.round((store.progresso.preenchidas / TOTAL) * 100) : 0)
const retomada = computed(() => {
  const id = store.progresso.ultima_secao
  const sec = WORKBOOK.find((s) => s.id === id)
  if (!sec) return null
  return sec.tipo === 'capitulo'
    ? { rotulo: `Capítulo ${sec.romano}`, titulo: sec.titulo }
    : { rotulo: `Seção Extra ${sec.numero}`, titulo: sec.titulo }
})

onMounted(async () => {
  const l = await getLead(email); nome.value = (l && l.nome) || ''
  await store.init()
  prontoProg.value = true
})

function abrirLivro() { router.push({ name: 'workbook' }) }
function abrirSumario() { router.push({ name: 'workbook', query: { ir: 'sumario' } }) }

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

// await no logout (senão a guarda de rota ainda vê a sessão e devolve o aluno
// pro ambiente) + recarga dura como defesa em profundidade: garante que nenhum
// estado de módulo — store, perfil em cache — sobreviva à troca de conta.
async function sair() {
  await logout()
  location.replace(location.pathname + '#/login')
}
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
      <p class="muted">Este é o seu ambiente do Curso Nacional de Formação em Holding Familiar.
        O workbook abaixo acompanha as aulas ao vivo — abra durante a transmissão e
        preencha as lacunas enquanto o professor dita.</p>
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

    <!-- O LIVRO — porta de entrada do workbook -->
    <section class="card estante">
      <button class="capa" @click="abrirLivro" aria-label="Abrir meu workbook">
        <span class="capa-lombada" aria-hidden="true"></span>
        <span class="capa-miolo">
          <span class="capa-kicker">Curso Nacional de Formação</span>
          <span class="capa-titulo">Holding<br />Familiar</span>
          <span class="capa-fio" aria-hidden="true"></span>
          <span class="capa-sub">Workbook do aluno</span>
        </span>
      </button>

      <div class="estante-info">
        <div class="eyebrow">Material do curso</div>
        <h2>Workbook — caderno de acompanhamento</h2>
        <p class="muted">
          As 149 lacunas do curso, capítulo a capítulo. Cada tecla é salva neste
          aparelho na hora e sincronizada quando há rede — pode fechar e voltar
          de onde parou, em qualquer dispositivo.
        </p>

        <div class="prog" v-if="prontoProg">
          <div class="prog-linha">
            <span class="prog-num">{{ pct }}%</span>
            <span class="prog-txt">{{ store.progresso.preenchidas }} de {{ TOTAL }} lacunas preenchidas</span>
          </div>
          <div class="prog-bar" role="progressbar" :aria-valuenow="pct" aria-valuemin="0"
            aria-valuemax="100" aria-label="Progresso do workbook">
            <div class="prog-fill" :style="{ width: pct + '%' }"></div>
          </div>
        </div>
        <div class="prog prog-sk" v-else aria-hidden="true"></div>

        <div class="estante-acoes">
          <button class="btn primary" @click="abrirLivro">
            {{ retomada ? `Continuar no ${retomada.rotulo}` : 'Começar a preencher' }}
          </button>
          <button class="btn ghost" @click="abrirSumario">Ver sumário</button>
        </div>
        <p v-if="retomada" class="retomada muted">Você parou em: {{ retomada.rotulo }} — {{ retomada.titulo }}</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.shell { position: relative; z-index: 1; max-width: 900px; margin: 0 auto; padding: 18px 18px 60px; display: flex; flex-direction: column; gap: 16px; }
.top { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; color: var(--ink); flex-wrap: wrap; gap: 8px; }
.acts { display: flex; gap: 8px; flex-wrap: wrap; }
.hero { padding: 24px 28px; }
.hero h1 { font-size: 25px; margin: 6px 0 8px; }
.hero p { margin: 0; font-size: 14.5px; line-height: 1.6; max-width: 640px; }
.senha { padding: 20px 24px; }
.senha h3 { margin: 4px 0 14px; }
.senha-form { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
@media (max-width: 640px) { .senha-form { grid-template-columns: 1fr; } }

/* ---- a estante: capa do livro + informações ---- */
.estante {
  padding: 28px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 30px;
  align-items: center;
}
.capa {
  position: relative;
  width: 196px;
  aspect-ratio: 3 / 4.15;
  display: flex;
  padding: 0;
  border: none;
  border-radius: 4px 10px 10px 4px;
  background: linear-gradient(160deg, #262019 0%, #17130e 70%);
  box-shadow: 0 18px 38px rgba(16, 12, 6, 0.35), inset -2px 0 6px rgba(0, 0, 0, 0.4);
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.capa:hover { transform: translateY(-4px) rotate(-0.6deg); box-shadow: 0 26px 46px rgba(16, 12, 6, 0.42), inset -2px 0 6px rgba(0, 0, 0, 0.4); }
.capa-lombada {
  flex: 0 0 12px;
  background: linear-gradient(90deg, var(--accent) 0%, #c85200 100%);
  box-shadow: inset -2px 0 3px rgba(0, 0, 0, 0.35);
}
.capa-miolo {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  padding: 20px 18px;
  text-align: left;
}
.capa-kicker {
  font-family: var(--fonte-ui);
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #d8a877;
}
.capa-titulo {
  font-family: var(--fonte-livro);
  font-size: 26px;
  font-weight: 700;
  line-height: 1.08;
  color: #f3ead9;
  letter-spacing: -0.01em;
}
.capa-fio { width: 34px; height: 2px; background: var(--accent); }
.capa-sub { font-family: var(--fonte-livro); font-style: italic; font-size: 12px; color: #bfae93; }

.estante-info h2 { font-size: 21px; margin: 8px 0 10px; }
.estante-info p { font-size: 14.5px; line-height: 1.65; max-width: 520px; margin: 0; }

.prog { margin-top: 16px; }
.prog-linha { display: flex; align-items: baseline; gap: 10px; margin-bottom: 7px; }
.prog-num { font-size: 21px; font-weight: 800; color: var(--accent); font-variant-numeric: tabular-nums; }
.prog-txt { font-size: 13px; color: var(--ink-2); }
.prog-bar { height: 7px; border-radius: 999px; background: var(--stroke); overflow: hidden; max-width: 420px; }
.prog-fill { height: 100%; background: var(--accent); border-radius: 999px; transition: width 0.3s ease; }
.prog-sk { height: 36px; max-width: 420px; border-radius: 8px; background: var(--stroke); opacity: 0.5; }

.estante-acoes { display: flex; gap: 10px; margin-top: 18px; flex-wrap: wrap; }
.retomada { font-size: 13px; margin-top: 10px; }

@media (max-width: 680px) {
  .estante { grid-template-columns: 1fr; justify-items: center; text-align: center; gap: 22px; }
  .estante-info { display: flex; flex-direction: column; align-items: center; }
  .estante-acoes { justify-content: center; }
  .capa-miolo { text-align: left; }
}
</style>
