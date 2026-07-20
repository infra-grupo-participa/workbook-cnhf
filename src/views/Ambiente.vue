<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import LogoCNHF from '../components/LogoCNHF.vue'
import { currentUser, getLead, logout, changePassword, getProgresso, setPresenca, marcarExercicio } from '../data/api.js'

const router = useRouter()
const email = currentUser()
const nome = ref('')

// aulas — aulaUrl (link da aula) e exercicioUrl (link do exercício).
// `liberada`: o exercício abre pra marcação de presença.
const AULAS = [
  { id: 'aula1', n: 1, titulo: 'Aula 1 · O sistema, não o improviso', desc: 'Por que abrir empresa não é planejamento e o sistema de células que protege o patrimônio.', liberada: true, aulaUrl: '#', exercicioUrl: '#' },
  { id: 'aula2', n: 2, titulo: 'Aula 2 · A primeira conversa com o cliente', desc: 'Como conduzir a Sessão de Viabilidade e sair com o próximo passo marcado.', liberada: true, aulaUrl: '#', exercicioUrl: '#' },
  { id: 'aula3', n: 3, titulo: 'Aula 3 · Do croqui ao contrato', desc: 'Precificar, propor e fechar o primeiro cliente de Holding Familiar.', liberada: false, aulaUrl: '#', exercicioUrl: '#' },
]

const progresso = ref({}) // { aula1: { presenca, exercicio } }
onMounted(async () => {
  const l = await getLead(email); nome.value = l?.nome || ''
  progresso.value = await getProgresso(email)
})

async function marcarPresenca(aula, status) {
  await setPresenca(email, aula.id, status)
  progresso.value = { ...progresso.value, [aula.id]: { ...(progresso.value[aula.id] || {}), presenca: status } }
}
const assistiu = (aula) => ['vivo', 'replay'].includes(progresso.value[aula.id]?.presenca)

// pop-up de confirmação quando tenta fazer o exercício sem ter assistido
const confirmar = ref(null) // aula em confirmação

function abrirAula(aula) { window.open(aula.aulaUrl, '_blank') }
function irParaExercicio(aula) {
  marcarExercicio(email, aula.id)
  progresso.value = { ...progresso.value, [aula.id]: { ...(progresso.value[aula.id] || {}), exercicio: true } }
  window.open(aula.exercicioUrl, '_blank')
}
function tentarExercicio(aula) {
  if (assistiu(aula)) irParaExercicio(aula)
  else confirmar.value = aula // não assistiu → pop-up
}
function confirmarSim() { const a = confirmar.value; confirmar.value = null; irParaExercicio(a) }
function confirmarNao() { const a = confirmar.value; confirmar.value = null; abrirAula(a) }

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
      <h1>Olá{{ nome ? ', ' + nome.split(' ')[0] : '' }} 👋</h1>
      <p class="muted">Seu acesso está liberado. Este é o seu workbook do Curso Nacional de Formação em Holding Familiar. O conteúdo de cada aula aparece aqui conforme o curso acontece, ao vivo.</p>
      <div class="tags">
        <span class="tag">100% ao vivo</span><span class="tag">3 noites · 19h30</span><span class="tag">Certificado ao final</span>
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

    <section class="aulas">
      <div class="eyebrow" style="margin-bottom:10px">Suas aulas</div>
      <div class="grade">
        <article v-for="a in AULAS" :key="a.id" class="card aula" :class="{ off: !a.liberada }">
          <div class="aula-topo">
            <div class="aula-n">{{ a.n }}</div>
            <div class="aula-body">
              <strong>{{ a.titulo }}</strong>
              <p class="muted">{{ a.desc }}</p>
            </div>
            <span v-if="!a.liberada" class="estado">em breve</span>
            <span v-else-if="progresso[a.id]?.exercicio" class="estado feito">✓ exercício feito</span>
          </div>

          <div v-if="a.liberada" class="aula-acoes">
            <div class="presenca">
              <span class="pergunta">Você assistiu a aula?</span>
              <div class="opcoes">
                <button class="chip" :class="{ sel: progresso[a.id]?.presenca === 'vivo' }" @click="marcarPresenca(a, 'vivo')">✓ Vi ao vivo</button>
                <button class="chip" :class="{ sel: progresso[a.id]?.presenca === 'replay' }" @click="marcarPresenca(a, 'replay')">↺ Vi pelo replay (24h)</button>
                <button class="chip" :class="{ sel: progresso[a.id]?.presenca === 'nao' }" @click="marcarPresenca(a, 'nao')">Ainda não vi</button>
              </div>
            </div>
            <div class="botoes">
              <button class="btn ghost" @click="abrirAula(a)">Assistir a aula</button>
              <button class="btn primary" @click="tentarExercicio(a)">Fazer o exercício</button>
            </div>
          </div>
        </article>
      </div>
      <p class="nota muted">O exercício só potencializa o resultado depois da aula. A sua presença e o exercício de cada aula ficam salvos no seu progresso.</p>
    </section>

    <!-- pop-up: tentou fazer o exercício sem ter assistido -->
    <Teleport to="body">
      <div v-if="confirmar" class="overlay" @click.self="confirmar = null">
        <div class="pop card">
          <div class="eyebrow">Antes de continuar</div>
          <h3>Você tem certeza que quer fazer o exercício agora?</h3>
          <p class="muted">
            O exercício da {{ confirmar.titulo.split('·')[0].trim() }} foi desenhado para ser feito <strong>depois</strong> da aula.
            Sem assistir primeiro, você perde o contexto e o exercício rende muito menos. Vale mais se preparar e voltar.
          </p>
          <div class="pop-btns">
            <button class="btn primary" @click="confirmarSim">Sim, tenho certeza que quero fazer esse exercício agora</button>
            <button class="btn" @click="confirmarNao">Não, prefiro me preparar melhor e assistir à aula</button>
          </div>
        </div>
      </div>
    </Teleport>
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
.grade { display: grid; grid-template-columns: 1fr; gap: 12px; }
.aula { display: flex; flex-direction: column; gap: 14px; padding: 16px 18px; }
.aula.off { opacity: .6; }
.aula-topo { display: flex; align-items: center; gap: 16px; }
.aula-n { flex: none; width: 40px; height: 40px; border-radius: 12px; background: var(--accent); color: #fff; font-weight: 900; display: grid; place-items: center; font-size: 18px; }
.aula-body { flex: 1; }
.aula-body strong { font-size: 15px; }
.aula-body p { margin: 3px 0 0; font-size: 13px; }
.estado { font-size: 11px; font-weight: 700; color: var(--ink-3); text-transform: uppercase; letter-spacing: .08em; }
.estado.feito { color: var(--ok); }

.aula-acoes { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; border-top: 1px solid var(--stroke); padding-top: 14px; }
.presenca { display: flex; flex-direction: column; gap: 8px; }
.pergunta { font-size: 12.5px; font-weight: 700; color: var(--ink-2); }
.opcoes { display: flex; gap: 8px; flex-wrap: wrap; }
.chip { font: inherit; font-size: 12.5px; font-weight: 600; color: var(--ink-2); background: var(--surface); border: 1px solid var(--stroke-strong); border-radius: 999px; padding: 7px 13px; cursor: pointer; transition: border-color .12s, background .12s; }
.chip:hover { border-color: var(--accent-line); }
.chip.sel { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
.botoes { display: flex; gap: 8px; }
.nota { font-size: 12.5px; margin: 14px 2px 0; line-height: 1.5; }

.overlay { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,.5); backdrop-filter: blur(6px); display: grid; place-items: center; padding: 24px; }
.pop { width: min(520px, 100%); padding: 26px 28px; }
.pop h3 { margin: 6px 0 10px; font-size: 20px; line-height: 1.3; }
.pop p { font-size: 14px; line-height: 1.6; margin: 0; }
.pop-btns { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
.pop-btns .btn { width: 100%; }
</style>
