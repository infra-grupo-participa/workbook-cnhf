<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import NotebookPen from '@lucide/vue/dist/esm/icons/notebook-pen.mjs'
import UserRound from '@lucide/vue/dist/esm/icons/user-round.mjs'
import LogOut from '@lucide/vue/dist/esm/icons/log-out.mjs'
import LogoCNHF from '../components/LogoCNHF.vue'
import CtaGrupo from '../components/CtaGrupo.vue'
import StatusSync from '../components/ui/StatusSync.vue'
import ModalBase from '../components/ui/ModalBase.vue'
import SumarioVivo from '../components/ui/SumarioVivo.vue'
import ContagemAula from '../components/ui/ContagemAula.vue'
import OnboardingModal from '../components/ui/OnboardingModal.vue'
import { OPCOES_REF, rotuloRef } from '../components/ui/useRefsLivro.js'
import { currentUser, getLead, logout, changePassword, listAnotacoes, criarAnotacao, isAdmin } from '../data/api.js'
import { store } from '../data/store.js'
import { WORKBOOK } from '../data/workbook-content.js'

const router = useRouter()
const email = currentUser()
const nome = ref('')
const ehAdmin = ref(false) // aluno não tem senha: só admin pode trocar

// ------------------------------------------------------------
// progresso real por capítulo (store local-first — funciona offline)
// ------------------------------------------------------------
function idsDaSecao(sec) {
  const ids = []
  for (const p of sec.paragrafos) {
    if (p.tipo === 'paragrafo') {
      for (const b of p.blocos) if (b.tipo === 'lacuna') ids.push(b.id)
    } else if (p.tipo === 'citacao-legal') ids.push(p.id)
  }
  return ids
}
const IDS_POR_SECAO = Object.fromEntries(WORKBOOK.map((s) => [s.id, idsDaSecao(s)]))
const TOTAL = WORKBOOK.reduce((a, s) => a + s.total_lacunas, 0)

const prontoProg = ref(false)
const pct = computed(() =>
  TOTAL ? Math.round((store.progresso.preenchidas / TOTAL) * 100) : 0)

const porSecao = computed(() => WORKBOOK.map((sec) => {
  const ids = IDS_POR_SECAO[sec.id]
  const cheias = ids.filter((id) => (store.valores[id] || '').trim().length > 0).length
  return { sec, cheias, total: ids.length }
}))
const capsCompletos = computed(() => porSecao.value.filter((x) => x.total > 0 && x.cheias === x.total).length)

const retomada = computed(() => {
  const id = store.progresso.ultima_secao
  const sec = WORKBOOK.find((s) => s.id === id)
  if (!sec) return null
  return sec.tipo === 'capitulo'
    ? { rotulo: `Capítulo ${sec.romano}`, titulo: sec.titulo }
    : { rotulo: `Seção Extra ${sec.numero}`, titulo: sec.titulo }
})

// ------------------------------------------------------------
// anotações recentes + captura rápida (a nota nasce referenciada
// ao capítulo em que o aluno parou)
// ------------------------------------------------------------
const notas = ref(null)               // null = carregando; [] = vazio
const notaTexto = ref('')
const notaRef = ref('')
const notaSalvando = ref(false)
const notaErro = ref('')
const notasRecentes = computed(() => (notas.value || []).slice(0, 3))

async function salvarNotaRapida() {
  const conteudo = notaTexto.value.trim()
  if (!conteudo || notaSalvando.value) return
  notaSalvando.value = true
  notaErro.value = ''
  const r = await criarAnotacao({ titulo: '', conteudo, aula: notaRef.value || null })
  notaSalvando.value = false
  if (!r.ok) { notaErro.value = 'Não foi possível salvar. Verifique sua conexão e tente de novo.'; return }
  if (!notas.value) notas.value = []
  notas.value.unshift(r.anotacao)
  notaTexto.value = ''
}

// ------------------------------------------------------------
// navegação para o livro
// ------------------------------------------------------------
function abrirLivro() { router.push({ name: 'workbook' }) }
function abrirSumario() { router.push({ name: 'workbook', query: { ir: 'sumario' } }) }
async function abrirSecao(id) {
  await store.init()                          // idempotente; garante identidade
  store.progresso.ultima_secao = id           // o livro retoma daqui
  router.push({ name: 'workbook' })
}

// mini-onboarding do primeiro acesso. Só abre DEPOIS do store.init(), senão
// quem já viu veria o modal de novo enquanto a leitura remota não voltasse.
const onboarding = ref(null)
function concluirOnboarding() { store.marcarOnboardingVisto() }
function reabrirOnboarding() {
  modalConta.value?.fechar()   // um <dialog> nativo por vez — evita empilhar modal sobre modal
  onboarding.value?.abrir()
}

onMounted(async () => {
  const [l] = await Promise.all([getLead(email), store.init()])
  nome.value = (l && l.nome) || ''
  prontoProg.value = true
  notaRef.value = store.progresso.ultima_secao || ''
  if (!store.progresso.onboarding_visto) onboarding.value?.abrir()
  notas.value = await listAnotacoes()
  ehAdmin.value = await isAdmin()
})

// ------------------------------------------------------------
// conta: dados + trocar senha, num modal (nada de empurrar o layout)
// ------------------------------------------------------------
const modalConta = ref(null)
const atual = ref(''); const nova = ref(''); const conf = ref('')
const msg = ref(''); const msgTipo = ref('ok')
const senhaSalvando = ref(false)
function abrirConta() {
  msg.value = ''; atual.value = nova.value = conf.value = ''
  modalConta.value?.abrir()
}
async function salvarSenha() {
  if (senhaSalvando.value) return
  msg.value = ''
  if (nova.value.length < 8) { msgTipo.value = 'bad'; msg.value = 'A nova senha precisa ter ao menos 8 caracteres.'; return }
  if (nova.value !== conf.value) { msgTipo.value = 'bad'; msg.value = 'As senhas não conferem.'; return }
  senhaSalvando.value = true
  const r = await changePassword(email, atual.value, nova.value)
  senhaSalvando.value = false
  if (!r.ok) {
    msgTipo.value = 'bad'
    msg.value = r.code === 'BAD_PASSWORD'
      ? 'Senha atual incorreta.'
      : 'Não foi possível trocar a senha agora. Tente novamente em instantes.'
    return
  }
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

const dataNota = (iso) => {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
</script>

<template>
  <div class="shell">
    <header class="top card">
      <LogoCNHF :height="34" />
      <div class="acts">
        <StatusSync v-if="prontoProg" class="top-status"
          :status="store.status.value" :pendentes="store.pendentes.value"
          :ultima-sync="store.ultimaSync.value" />
        <button class="btn ghost" @click="abrirConta">
          <UserRound :size="15" :stroke-width="2" aria-hidden="true" /> Conta
        </button>
        <button class="btn" @click="sair">
          <LogOut :size="15" :stroke-width="2" aria-hidden="true" /> Sair
        </button>
      </div>
    </header>

    <main class="miolo">
      <!-- A ESTANTE: capa do livro + retomada -->
      <section class="card estante" aria-labelledby="estante-h">
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
          <div class="eyebrow">Ambiente do aluno</div>
          <h1 id="estante-h">Olá{{ nome ? ', ' + nome.split(' ')[0] : '' }}</h1>
          <p class="muted">
            Seu workbook acompanha as aulas ao vivo: abra durante a transmissão e
            preencha as lacunas enquanto o professor dita. Cada tecla é salva neste
            aparelho na hora e sincronizada quando há rede.
          </p>

          <div class="prog" v-if="prontoProg">
            <div class="prog-linha">
              <span class="prog-num">{{ pct }}%</span>
              <span class="prog-txt">{{ store.progresso.preenchidas }} de {{ TOTAL }} lacunas
                <template v-if="capsCompletos"> · {{ capsCompletos }} {{ capsCompletos === 1 ? 'capítulo completo' : 'capítulos completos' }}</template>
              </span>
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
            <button class="btn ghost" @click="abrirSumario">Ver o livro do início</button>
          </div>
          <p v-if="retomada" class="retomada muted">Você parou em: {{ retomada.rotulo }} — {{ retomada.titulo }}</p>
        </div>
      </section>

      <ContagemAula />

      <CtaGrupo />

      <div class="colunas">
        <!-- SUMÁRIO VIVO -->
        <section class="card painel" aria-labelledby="sumario-h">
          <div class="eyebrow">Seu percurso</div>
          <h2 id="sumario-h">Sumário</h2>
          <SumarioVivo v-if="prontoProg" :itens="porSecao"
            :ultima-secao="store.progresso.ultima_secao" @abrir="abrirSecao" />
          <div v-else class="sk-lista" aria-hidden="true">
            <div class="sk-linha" v-for="i in 6" :key="i"></div>
          </div>
          <p class="painel-dica muted">Toque num capítulo para abrir o livro naquele ponto.
            A fita <span class="dica-fita" aria-hidden="true"></span> marca onde você parou.</p>
        </section>

        <!-- ANOTAÇÕES -->
        <section class="card painel" aria-labelledby="notas-h">
          <div class="painel-topo">
            <div>
              <div class="eyebrow">Sua margem do livro</div>
              <h2 id="notas-h">Anotações</h2>
            </div>
            <button class="btn ghost mini-btn" @click="router.push({ name: 'anotacoes' })">
              <NotebookPen :size="15" :stroke-width="2" aria-hidden="true" /> Ver todas
            </button>
          </div>

          <form class="nota-rapida" @submit.prevent="salvarNotaRapida">
            <label class="sr-only" for="nota-rapida-texto">Nova anotação</label>
            <textarea id="nota-rapida-texto" v-model="notaTexto" rows="3"
              placeholder="Anote um insight da aula…"></textarea>
            <div class="nota-rapida-acoes">
              <label class="sr-only" for="nota-rapida-ref">Capítulo da anotação</label>
              <select id="nota-rapida-ref" v-model="notaRef">
                <option v-for="o in OPCOES_REF" :key="o.id" :value="o.id">{{ o.label }}</option>
              </select>
              <button class="btn primary" type="submit" :disabled="notaSalvando || !notaTexto.trim()">
                {{ notaSalvando ? 'Salvando…' : 'Guardar' }}
              </button>
            </div>
            <p v-if="notaErro" class="alert bad" role="alert">{{ notaErro }}</p>
          </form>

          <div aria-live="polite">
            <p v-if="notas === null" class="muted vazio-nota">Carregando anotações…</p>
            <p v-else-if="!notas.length" class="muted vazio-nota">
              Nenhuma anotação ainda. O que ficou da aula de hoje?
            </p>
            <ul v-else class="notas-lista" role="list">
              <li v-for="n in notasRecentes" :key="n.id" class="nota-item">
                <div class="nota-meta">
                  <span class="nota-ref">{{ rotuloRef(n.aula) }}</span>
                  <span class="nota-data muted">{{ dataNota(n.atualizado_em || n.criado_em) }}</span>
                </div>
                <p class="nota-trecho">{{ n.titulo || n.conteudo }}</p>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </main>

    <!-- primeiro acesso: o que é o workbook, como usar e quando começa -->
    <OnboardingModal ref="onboarding" @concluir="concluirOnboarding" />

    <!-- CONTA: dados + trocar senha -->
    <ModalBase ref="modalConta" titulo="Sua conta">
      <dl class="conta-dados">
        <div><dt>Nome</dt><dd>{{ nome || '—' }}</dd></div>
        <div><dt>E-mail de acesso</dt><dd>{{ email }}</dd></div>
      </dl>
      <button type="button" class="btn ghost block rever-onboarding" @click="reabrirOnboarding">
        Rever boas-vindas
      </button>
      <form v-if="ehAdmin" class="conta-form" @submit.prevent="salvarSenha">
        <h3>Trocar senha</h3>
        <label class="field" for="senha-atual"><span>Senha atual</span>
          <input id="senha-atual" type="password" v-model="atual" autocomplete="current-password"
            :aria-describedby="msg && msgTipo === 'bad' ? 'senha-msg' : undefined" />
        </label>
        <label class="field" for="senha-nova"><span>Nova senha (mín. 8 caracteres)</span>
          <input id="senha-nova" type="password" v-model="nova" autocomplete="new-password"
            :aria-describedby="msg && msgTipo === 'bad' ? 'senha-msg' : undefined" />
        </label>
        <label class="field" for="senha-conf"><span>Confirmar nova senha</span>
          <input id="senha-conf" type="password" v-model="conf" autocomplete="new-password"
            :aria-describedby="msg && msgTipo === 'bad' ? 'senha-msg' : undefined" />
        </label>
        <p v-if="msg" id="senha-msg" class="alert" :class="msgTipo" role="alert">{{ msg }}</p>
        <button class="btn primary block" type="submit" :disabled="senhaSalvando">
          {{ senhaSalvando ? 'Salvando…' : 'Salvar nova senha' }}
        </button>
      </form>
    </ModalBase>
  </div>
</template>

<style scoped>
.shell { position: relative; z-index: 1; max-width: 980px; margin: 0 auto; padding: 18px 18px 72px; display: flex; flex-direction: column; gap: 16px; }
.top { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; color: var(--ink); flex-wrap: wrap; gap: 8px; }
.acts { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.top-status { margin-right: 4px; }
.miolo { display: flex; flex-direction: column; gap: 16px; }

.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

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
  /* lombada: do laranja claro da Central ao queimado, como os botões de lá */
  background: linear-gradient(90deg, var(--accent-strong) 0%, var(--accent) 100%);
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

.estante-info h1 { font-family: var(--fonte-livro); font-size: 27px; margin: 8px 0 10px; }
.estante-info p { font-size: 14.5px; line-height: 1.65; max-width: 520px; margin: 0; }

.prog { margin-top: 16px; }
.prog-linha { display: flex; align-items: baseline; gap: 10px; margin-bottom: 7px; flex-wrap: wrap; }
.prog-num { font-size: 21px; font-weight: 800; color: var(--resposta); font-variant-numeric: tabular-nums; }
.prog-txt { font-size: 13px; color: var(--ink-2); }
.prog-bar { height: 7px; border-radius: 999px; background: var(--stroke); overflow: hidden; max-width: 420px; }
.prog-fill { height: 100%; background: var(--cta-gradiente); border-radius: 999px; transition: width 0.3s ease; }
.prog-sk { height: 36px; max-width: 420px; border-radius: 8px; background: var(--stroke); opacity: 0.5; }

.estante-acoes { display: flex; gap: 10px; margin-top: 18px; flex-wrap: wrap; }
.retomada { font-size: 13px; margin-top: 10px; }

/* ---- colunas: sumário vivo + anotações ---- */
.colunas { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; align-items: start; }
.painel { padding: 20px 24px 18px; }
.painel h2 { font-family: var(--fonte-livro); font-size: 20px; margin: 6px 0 12px; }
.painel-topo { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.painel-dica { font-size: 12.5px; margin: 12px 0 0; }
.dica-fita { display: inline-block; width: 4px; height: 12px; border-radius: 2px; background: var(--resposta); vertical-align: -2px; }
.mini-btn { padding: 8px 12px; font-size: 13px; }

.sk-lista { display: flex; flex-direction: column; gap: 10px; padding: 6px 0; }
.sk-linha { height: 30px; border-radius: 6px; background: var(--stroke); opacity: 0.5; }

/* ---- anotações rápidas ---- */
.nota-rapida { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.nota-rapida textarea { min-height: 74px; font-family: var(--fonte-livro); font-size: 14.5px; }
.nota-rapida-acoes { display: flex; gap: 8px; }
.nota-rapida-acoes select { flex: 1; min-width: 0; font-size: 13.5px; padding: 10px 12px; min-height: 44px; }
.nota-rapida-acoes .btn { flex: 0 0 auto; }
.vazio-nota { font-size: 13.5px; margin: 4px 0 0; }

.notas-lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.nota-item { padding: 10px 2px; }
.nota-item + .nota-item { border-top: 1px solid var(--stroke); }
.nota-meta { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 3px; }
.nota-ref { font-size: 11px; font-weight: 700; color: var(--resposta); text-transform: uppercase; letter-spacing: 0.06em; }
.nota-data { font-size: 11.5px; }
.nota-trecho {
  margin: 0;
  font-family: var(--fonte-livro);
  font-size: 14px;
  line-height: 1.5;
  color: var(--ink);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ---- modal conta ---- */
.conta-dados { margin: 0 0 16px; display: flex; flex-direction: column; gap: 8px; }
.conta-dados div { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
.conta-dados dt { color: var(--ink-2); font-weight: 600; }
.conta-dados dd { margin: 0; text-align: right; overflow-wrap: anywhere; }
.rever-onboarding { margin: 0 0 16px; }
.conta-form { display: flex; flex-direction: column; gap: 12px; border-top: 1px solid var(--stroke); padding-top: 16px; }
.conta-form h3 { margin: 0; font-size: 15px; }

@media (max-width: 780px) {
  .colunas { grid-template-columns: 1fr; }
}
@media (max-width: 680px) {
  .estante { grid-template-columns: 1fr; justify-items: center; text-align: center; gap: 22px; padding: 22px 18px; }
  .estante-info { display: flex; flex-direction: column; align-items: center; }
  .estante-acoes { justify-content: center; }
  .estante-acoes .btn { min-height: 44px; }
  .capa-miolo { text-align: left; }
  .prog-bar { width: 100%; }
  .top-status { order: 3; width: 100%; justify-content: center; margin: 2px 0 0; }
  .acts { justify-content: center; width: 100%; }
  .top { justify-content: center; }
}
</style>
