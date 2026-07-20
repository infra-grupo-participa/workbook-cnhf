<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import LogoCNHF from '../components/LogoCNHF.vue'
import { listAnotacoes, criarAnotacao, atualizarAnotacao, removerAnotacao } from '../data/api.js'

const router = useRouter()

// etapas do ciclo (mesmas aulas do ambiente + "geral" p/ mapa mental livre)
const ETAPAS = [
  { id: '', label: 'Geral' },
  { id: 'aula1', label: 'Aula 1' },
  { id: 'aula2', label: 'Aula 2' },
  { id: 'aula3', label: 'Aula 3' },
]
const rotulo = (id) => ETAPAS.find((e) => e.id === (id || ''))?.label || 'Geral'

const notas = ref([])
const carregando = ref(true)

// editor (nova nota ou edição)
const editId = ref(null)
const titulo = ref('')
const conteudo = ref('')
const aula = ref('')
const salvando = ref(false)
const filtro = ref('')

const notasFiltradas = computed(() =>
  filtro.value ? notas.value.filter((n) => (n.aula || '') === filtro.value) : notas.value
)

onMounted(async () => {
  notas.value = await listAnotacoes()
  carregando.value = false
})

function novo() { editId.value = null; titulo.value = ''; conteudo.value = ''; aula.value = filtro.value || '' }
function editar(n) { editId.value = n.id; titulo.value = n.titulo; conteudo.value = n.conteudo; aula.value = n.aula || '' }
function cancelar() { editId.value = null; titulo.value = ''; conteudo.value = '' }

async function salvar() {
  if (!conteudo.value.trim() && !titulo.value.trim()) return
  salvando.value = true
  const payload = { titulo: titulo.value, conteudo: conteudo.value, aula: aula.value || null }
  if (editId.value) {
    const r = await atualizarAnotacao(editId.value, payload)
    if (r.ok) {
      const i = notas.value.findIndex((n) => n.id === editId.value)
      if (i >= 0) notas.value[i] = r.anotacao
    }
  } else {
    const r = await criarAnotacao(payload)
    if (r.ok) notas.value.unshift(r.anotacao)
  }
  salvando.value = false
  cancelar()
}

async function remover(n) {
  const r = await removerAnotacao(n.id)
  if (r.ok) notas.value = notas.value.filter((x) => x.id !== n.id)
}

function voltar() { router.push({ name: 'ambiente' }) }
</script>

<template>
  <div class="shell">
    <header class="top card">
      <LogoCNHF :height="34" />
      <button class="btn ghost" @click="voltar">← Voltar ao ambiente</button>
    </header>

    <section class="hero card">
      <div class="eyebrow">Sua trilha</div>
      <h1>Minhas anotações</h1>
      <p class="muted">Registre aqui tudo que for aprendendo ao longo do ciclo — como um mapa mental do seu percurso. Suas notas ficam salvas e só você as vê.</p>
    </section>

    <!-- editor -->
    <section class="card editor">
      <div class="editor-head">
        <div class="eyebrow">{{ editId ? 'Editando anotação' : 'Nova anotação' }}</div>
        <select v-model="aula" class="etapa-sel">
          <option v-for="e in ETAPAS" :key="e.id" :value="e.id">{{ e.label }}</option>
        </select>
      </div>
      <input class="titulo-in" type="text" v-model="titulo" placeholder="Título (opcional)" />
      <textarea v-model="conteudo" placeholder="Escreva sua anotação, insight ou mapa mental..." rows="4" />
      <div class="editor-btns">
        <button v-if="editId" class="btn" @click="cancelar">Cancelar</button>
        <button class="btn primary" :disabled="salvando" @click="salvar">
          {{ salvando ? 'Salvando...' : (editId ? 'Salvar alterações' : 'Adicionar anotação') }}
        </button>
      </div>
    </section>

    <!-- filtros -->
    <div class="filtros">
      <button class="chip" :class="{ sel: filtro === '' }" @click="filtro = ''">Todas</button>
      <button v-for="e in ETAPAS.filter(e => e.id)" :key="e.id"
        class="chip" :class="{ sel: filtro === e.id }" @click="filtro = e.id">{{ e.label }}</button>
    </div>

    <!-- lista -->
    <section class="lista">
      <p v-if="carregando" class="muted">Carregando...</p>
      <p v-else-if="!notasFiltradas.length" class="muted vazio">Nenhuma anotação ainda. Comece registrando o que você aprendeu hoje.</p>
      <article v-for="n in notasFiltradas" :key="n.id" class="card nota">
        <div class="nota-head">
          <span class="etapa-tag">{{ rotulo(n.aula) }}</span>
          <div class="nota-acts">
            <button class="mini" @click="editar(n)">Editar</button>
            <button class="mini danger" @click="remover(n)">Excluir</button>
          </div>
        </div>
        <strong v-if="n.titulo" class="nota-titulo">{{ n.titulo }}</strong>
        <p class="nota-corpo">{{ n.conteudo }}</p>
      </article>
    </section>
  </div>
</template>

<style scoped>
.shell { position: relative; z-index: 1; max-width: 780px; margin: 0 auto; padding: 18px 18px 60px; display: flex; flex-direction: column; gap: 16px; }
.top { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; color: var(--ink); }
.hero { padding: 24px 26px; }
.hero h1 { font-size: 24px; margin: 6px 0 8px; }
.hero p { margin: 0; font-size: 14px; line-height: 1.6; max-width: 600px; }

.editor { padding: 18px 20px; display: flex; flex-direction: column; gap: 10px; }
.editor-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.etapa-sel { width: auto; }
.titulo-in { font-weight: 600; }
.editor-btns { display: flex; justify-content: flex-end; gap: 8px; }

.filtros { display: flex; gap: 8px; flex-wrap: wrap; }
.chip { font: inherit; font-size: 12.5px; font-weight: 600; color: var(--ink-2); background: var(--surface); border: 1px solid var(--stroke-strong); border-radius: 999px; padding: 6px 13px; cursor: pointer; }
.chip.sel { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }

.lista { display: flex; flex-direction: column; gap: 12px; }
.vazio { padding: 8px 2px; }
.nota { padding: 16px 18px; }
.nota-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.etapa-tag { font-size: 11px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: .06em; background: var(--accent-soft); padding: 3px 10px; border-radius: 999px; }
.nota-acts { display: flex; gap: 6px; }
.mini { font: inherit; font-size: 12px; font-weight: 600; color: var(--ink-2); background: none; border: 1px solid var(--stroke-strong); border-radius: 8px; padding: 4px 10px; cursor: pointer; }
.mini:hover { border-color: var(--accent-line); }
.mini.danger:hover { border-color: var(--bad, #e5484d); color: var(--bad, #e5484d); }
.nota-titulo { display: block; font-size: 15px; margin-bottom: 4px; }
.nota-corpo { margin: 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: var(--ink); }
</style>
