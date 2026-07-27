<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import LogoCNHF from '../components/LogoCNHF.vue'
import ArrowLeft from '@lucide/vue/dist/esm/icons/arrow-left.mjs'
import BookOpen from '@lucide/vue/dist/esm/icons/book-open.mjs'
import { listAnotacoes, criarAnotacao, atualizarAnotacao, removerAnotacao } from '../data/api.js'
import { store } from '../data/store.js'
import { OPCOES_REF, rotuloRef, tituloRef, ehSecaoDoLivro } from '../components/ui/useRefsLivro.js'

const router = useRouter()

const notas = ref(null)               // null = carregando
const busca = ref('')

// editor (nova nota ou edição)
const editId = ref(null)
const titulo = ref('')
const conteudo = ref('')
const aula = ref('')
const salvando = ref(false)
const erroSalvar = ref('')
const conteudoEl = ref(null)

// exclusão em dois tempos (nada de apagar no primeiro clique)
const confirmaId = ref(null)

onMounted(async () => {
  const [lista] = await Promise.all([listAnotacoes(), store.init()])
  notas.value = lista
  // nota nova nasce referenciada ao capítulo em que o aluno parou
  if (!editId.value) aula.value = store.progresso.ultima_secao || ''
})

/* opções do select — inclui o valor legado ('aula1'…) da nota em edição,
   para não perder a referência antiga ao salvar */
const opcoesEditor = computed(() => {
  const base = [...OPCOES_REF]
  if (aula.value && !base.some((o) => o.id === aula.value)) {
    base.push({ id: aula.value, label: rotuloRef(aula.value) + ' (antiga)' })
  }
  return base
})

const filtradas = computed(() => {
  const q = busca.value.trim().toLowerCase()
  if (!q) return notas.value || []
  return (notas.value || []).filter((n) =>
    (n.titulo || '').toLowerCase().includes(q) || (n.conteudo || '').toLowerCase().includes(q))
})

/* agrupamento na ordem do livro: capítulos primeiro, depois Geral, depois
   referências antigas (aula1…) que ainda existirem */
const grupos = computed(() => {
  const mapa = new Map()
  for (const n of filtradas.value) {
    const k = n.aula || ''
    if (!mapa.has(k)) mapa.set(k, [])
    mapa.get(k).push(n)
  }
  const ordemLivro = OPCOES_REF.filter((o) => o.id).map((o) => o.id)
  const chaves = [...mapa.keys()]
  chaves.sort((a, b) => {
    const pos = (k) => {
      if (k === '') return ordemLivro.length            // Geral depois dos capítulos
      const i = ordemLivro.indexOf(k)
      return i >= 0 ? i : ordemLivro.length + 1         // legado por último
    }
    return pos(a) - pos(b)
  })
  return chaves.map((k) => ({
    ref: k,
    rotulo: rotuloRef(k),
    titulo: tituloRef(k),
    noLivro: ehSecaoDoLivro(k),
    notas: mapa.get(k),
  }))
})

function novo() {
  editId.value = null; titulo.value = ''; conteudo.value = ''
  aula.value = store.progresso.ultima_secao || ''
  nextTick(() => conteudoEl.value?.focus())
}
function editar(n) {
  editId.value = n.id; titulo.value = n.titulo; conteudo.value = n.conteudo
  aula.value = n.aula || ''
  confirmaId.value = null
  window.scrollTo({ top: 0, behavior: 'smooth' })
  nextTick(() => conteudoEl.value?.focus())
}
function cancelar() {
  editId.value = null; titulo.value = ''; conteudo.value = ''
  aula.value = store.progresso.ultima_secao || ''
}

async function salvar() {
  if (!conteudo.value.trim() && !titulo.value.trim()) return
  if (salvando.value) return
  salvando.value = true
  erroSalvar.value = ''
  const payload = { titulo: titulo.value, conteudo: conteudo.value, aula: aula.value || null }
  let r
  if (editId.value) {
    r = await atualizarAnotacao(editId.value, payload)
    if (r.ok) {
      const i = notas.value.findIndex((n) => n.id === editId.value)
      if (i >= 0) notas.value[i] = r.anotacao
    }
  } else {
    r = await criarAnotacao(payload)
    if (r.ok) notas.value.unshift(r.anotacao)
  }
  salvando.value = false
  if (!r.ok) { erroSalvar.value = 'Não foi possível salvar. Verifique sua conexão e tente de novo.'; return }
  cancelar()
}

async function remover(n) {
  const r = await removerAnotacao(n.id)
  confirmaId.value = null
  if (r.ok) notas.value = notas.value.filter((x) => x.id !== n.id)
}

/* abre o livro no capítulo da anotação (via retomada do store —
   o Workbook reabre em `progresso.ultima_secao`) */
async function abrirNoLivro(refId) {
  await store.init()
  store.progresso.ultima_secao = refId
  router.push({ name: 'workbook' })
}

function voltar() { router.push({ name: 'ambiente' }) }
const dataFmt = (iso) => new Date(iso).toLocaleDateString('pt-BR',
  { day: '2-digit', month: 'short', year: 'numeric' })
</script>

<template>
  <div class="shell">
    <header class="top card">
      <LogoCNHF :height="34" />
      <button class="btn ghost" @click="voltar">
        <ArrowLeft :size="16" :stroke-width="2" aria-hidden="true" /> Voltar ao ambiente
      </button>
    </header>

    <main class="miolo">
      <section class="hero card">
        <div class="eyebrow">Sua margem do livro</div>
        <h1>Minhas anotações</h1>
        <p class="muted">Cada anotação pode ficar presa a um capítulo do workbook — como escrever
          na margem do livro. Só você as vê, e daqui você volta direto ao ponto da leitura.</p>
      </section>

      <!-- editor -->
      <section class="card editor" aria-label="Editor de anotação">
        <div class="editor-head">
          <div class="eyebrow">{{ editId ? 'Editando anotação' : 'Nova anotação' }}</div>
          <label class="sr-only" for="ed-ref">Capítulo da anotação</label>
          <select id="ed-ref" v-model="aula" class="etapa-sel">
            <option v-for="o in opcoesEditor" :key="o.id" :value="o.id">{{ o.label }}</option>
          </select>
        </div>
        <label class="sr-only" for="ed-titulo">Título da anotação (opcional)</label>
        <input id="ed-titulo" class="titulo-in" type="text" v-model="titulo" placeholder="Título (opcional)" />
        <label class="sr-only" for="ed-corpo">Texto da anotação</label>
        <textarea id="ed-corpo" ref="conteudoEl" v-model="conteudo"
          placeholder="Escreva sua anotação, insight ou mapa mental…" rows="4" />
        <p v-if="erroSalvar" class="alert bad" role="alert">{{ erroSalvar }}</p>
        <div class="editor-btns">
          <button v-if="editId" class="btn" @click="cancelar">Cancelar edição</button>
          <button class="btn primary" :disabled="salvando || (!conteudo.trim() && !titulo.trim())" @click="salvar">
            {{ salvando ? 'Salvando…' : (editId ? 'Salvar alterações' : 'Guardar anotação') }}
          </button>
        </div>
      </section>

      <!-- busca -->
      <div class="ferramentas" v-if="notas && notas.length">
        <label class="sr-only" for="busca-notas">Buscar nas anotações</label>
        <input id="busca-notas" type="text" v-model="busca" class="busca"
          placeholder="Buscar nas anotações…" />
        <span class="conta muted" aria-live="polite">{{ filtradas.length }} de {{ notas.length }}</span>
      </div>

      <!-- lista agrupada por capítulo -->
      <p v-if="notas === null" class="muted vazio">Carregando…</p>
      <p v-else-if="!notas.length" class="muted vazio card">
        Nenhuma anotação ainda. Comece registrando o que ficou da aula de hoje —
        a nota já nasce presa ao capítulo em que você parou.
      </p>
      <p v-else-if="!filtradas.length" class="muted vazio card">
        Nada encontrado para “{{ busca }}”.
      </p>

      <section v-for="g in grupos" :key="g.ref || 'geral'" class="grupo"
        :aria-label="`Anotações de ${g.rotulo}`">
        <header class="grupo-head">
          <h2 class="grupo-titulo">
            {{ g.rotulo }}<span v-if="g.titulo" class="grupo-sub"> — {{ g.titulo }}</span>
          </h2>
          <button v-if="g.noLivro" class="btn ghost mini-btn" @click="abrirNoLivro(g.ref)">
            <BookOpen :size="14" :stroke-width="2" aria-hidden="true" /> Abrir no livro
          </button>
        </header>

        <article v-for="n in g.notas" :key="n.id" class="card nota">
          <div class="nota-head">
            <span class="nota-data muted">{{ dataFmt(n.atualizado_em || n.criado_em) }}</span>
            <div class="nota-acts">
              <template v-if="confirmaId === n.id">
                <span class="confirma-txt">Excluir esta anotação?</span>
                <button class="mini danger" @click="remover(n)">Excluir</button>
                <button class="mini" @click="confirmaId = null">Manter</button>
              </template>
              <template v-else>
                <button class="mini" @click="editar(n)">Editar</button>
                <button class="mini danger" @click="confirmaId = n.id">Excluir</button>
              </template>
            </div>
          </div>
          <strong v-if="n.titulo" class="nota-titulo">{{ n.titulo }}</strong>
          <p class="nota-corpo">{{ n.conteudo }}</p>
        </article>
      </section>
    </main>
  </div>
</template>

<style scoped>
.shell { position: relative; z-index: 1; max-width: 780px; margin: 0 auto; padding: 18px 18px 72px; display: flex; flex-direction: column; gap: 16px; }
.miolo { display: flex; flex-direction: column; gap: 16px; }
.top { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; color: var(--ink); flex-wrap: wrap; gap: 8px; }
.hero { padding: 24px 26px; }
.hero h1 { font-family: var(--fonte-livro); font-size: 24px; margin: 6px 0 8px; }
.hero p { margin: 0; font-size: 14px; line-height: 1.6; max-width: 620px; }

.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

.editor { padding: 18px 20px; display: flex; flex-direction: column; gap: 10px; }
.editor-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.etapa-sel { width: auto; max-width: 100%; font-size: 13.5px; padding: 10px 12px; min-height: 44px; }
.titulo-in { font-weight: 600; }
.editor textarea { font-family: var(--fonte-livro); font-size: 15px; line-height: 1.6; }
.editor-btns { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.editor-btns .btn { min-height: 44px; }

.ferramentas { display: flex; align-items: center; gap: 12px; }
.busca { flex: 1; }
.conta { font-size: 12.5px; white-space: nowrap; font-variant-numeric: tabular-nums; }

.vazio { padding: 22px; text-align: center; font-size: 14px; }

.grupo { display: flex; flex-direction: column; gap: 10px; }
.grupo-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 4px 2px 0; flex-wrap: wrap; }
.grupo-titulo { margin: 0; font-family: var(--fonte-livro); font-size: 16.5px; font-weight: 700; }
.grupo-sub { font-weight: 400; font-style: italic; color: var(--ink-2); }
.mini-btn { padding: 7px 12px; font-size: 12.5px; min-height: 36px; }

.nota { padding: 14px 18px 16px; }
.nota-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; flex-wrap: wrap; }
.nota-data { font-size: 12px; }
.nota-acts { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.confirma-txt { font-size: 12.5px; font-weight: 600; color: var(--ink-2); }
.mini { font: inherit; font-size: 12px; font-weight: 600; color: var(--ink-2); background: none; border: 1px solid var(--stroke-strong); border-radius: 8px; padding: 8px 12px; min-height: 36px; cursor: pointer; }
.mini:hover { border-color: var(--accent-line); color: var(--ink); }
.mini.danger:hover { border-color: var(--bad); color: var(--bad-text); }
.nota-titulo { display: block; font-size: 15px; margin-bottom: 4px; }
.nota-corpo { margin: 0; font-family: var(--fonte-livro); font-size: 14.5px; line-height: 1.65; white-space: pre-wrap; color: var(--ink); }

@media (max-width: 480px) {
  .mini { min-height: 44px; }
}
</style>
