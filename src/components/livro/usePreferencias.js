/* ============================================================
   Preferências de leitura — singleton reativo, persistido.
   Aplica no <html> como data-attributes (styles.css mapeia
   para as variáveis --fs-livro/--lh-livro/--fonte-corpo/tema).
   ============================================================ */
import { reactive, ref, watch } from 'vue'

const CHAVE = 'wb-prefs'
const CHAVE_LEGADA = 'wb-theme' // App.vue antigo gravava 'light'|'dark' aqui

const TEMAS = ['claro', 'sepia', 'escuro']
const TEMA_PARA_DATASET = { claro: 'light', sepia: 'sepia', escuro: 'dark' }

function carregar() {
  const base = { tema: null, fs: 2, lh: 2, fonte: 'serifa', justificar: false }
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null')
    if (salvo && typeof salvo === 'object') Object.assign(base, salvo)
  } catch { /* preferências corrompidas → padrão */ }
  if (!TEMAS.includes(base.tema)) {
    // migra a preferência antiga; senão respeita prefers-color-scheme
    const legado = localStorage.getItem(CHAVE_LEGADA)
    if (legado === 'dark') base.tema = 'escuro'
    else if (legado === 'light') base.tema = 'claro'
    else {
      const escuro = typeof matchMedia !== 'undefined' &&
        matchMedia('(prefers-color-scheme: dark)').matches
      base.tema = escuro ? 'escuro' : 'claro'
    }
  }
  base.fs = [1, 2, 3].includes(base.fs) ? base.fs : 2
  base.lh = [1, 2, 3].includes(base.lh) ? base.lh : 2
  base.fonte = base.fonte === 'sans' ? 'sans' : 'serifa'
  base.justificar = !!base.justificar
  return base
}

export const prefs = reactive(carregar())

function aplicar() {
  const el = document.documentElement
  el.dataset.theme = TEMA_PARA_DATASET[prefs.tema] || 'light'
  el.dataset.fs = String(prefs.fs)
  el.dataset.lh = String(prefs.lh)
  el.dataset.fonte = prefs.fonte
  el.dataset.justif = prefs.justificar ? 'on' : 'off'
}

watch(prefs, () => {
  aplicar()
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ ...prefs }))
    // mantém a chave legada coerente p/ qualquer leitor antigo
    localStorage.setItem(CHAVE_LEGADA, TEMA_PARA_DATASET[prefs.tema] === 'dark' ? 'dark' : 'light')
  } catch { /* storage cheio/bloqueado: segue sem persistir */ }
}, { deep: true })

if (typeof document !== 'undefined') aplicar()

/* ------------------------------------------------------------
   Troca coordenada de fonte (bug do Chromium): o navegador não
   refaz o layout de <textarea>/<input> quando uma webfont termina
   de carregar — spans trocam para a Literata, campos ficam presos
   no fallback, e o fantasma que ancora o sufixo desalinha do texto
   digitado. Por isso `--fonte-livro` NASCE na stack de fallback e
   só ganha a Literata via html[data-fontes='ok'] quando as faces
   já estão na memória: a mudança de família força re-resolução em
   TODOS os elementos ao mesmo tempo, campos incluídos.
   `fontesProntas` é reativo para os textareas recalcularem altura.
   ------------------------------------------------------------ */
export const fontesProntas = ref(false)

/** Mesmo depois do swap de família, o Chromium mantém o texto de campos já
 *  renderizados na fonte antiga até QUALQUER mudança de estilo inline no
 *  elemento (verificado empiricamente). Cutuca cada lacuna existente. */
function cutucarCamposDeLacuna() {
  document.querySelectorAll('textarea[data-lacuna], input[data-lacuna]').forEach((el) => {
    const anterior = el.style.fontStyle
    el.style.fontStyle = 'normal'
    void el.offsetWidth                // reflow com o estilo alternativo
    el.style.fontStyle = anterior      // volta ao itálico já com a face nova
    if (el.tagName === 'TEXTAREA') {   // métrica nova → altura nova
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
  })
}

async function ativarLiterata() {
  // A Montserrat entra na MESMA troca: `data-fontes='ok'` muda as duas
  // famílias de uma vez. Se ligássemos o flag só com a Literata pronta, a
  // UI trocaria para a Montserrat depois — e os campos ficariam presos no
  // fallback de novo, que é justamente o bug que esta coordenação evita.
  const faces = [
    '1em Literata', 'italic 1em Literata', '600 1em Literata', '700 1em Literata',
    '1em Montserrat', '600 1em Montserrat', '700 1em Montserrat', '800 1em Montserrat'
  ]
  // as @font-face vêm do CSS e podem ainda não estar registradas no
  // FontFaceSet quando este módulo roda → tenta por até ~5s
  for (let i = 0; i < 20; i++) {
    const listas = await Promise.all(
      faces.map((f) => document.fonts.load(f).catch(() => []))
    )
    // `some` ligava o flag com QUALQUER face pronta. Com duas famílias isso
    // dispararia com a primeira, e a outra trocaria depois — recriando o
    // desalinho. Exige uma face de cada família.
    const temLiterata = listas.slice(0, 4).some((l) => l.length > 0)
    const temMontserrat = listas.slice(4).some((l) => l.length > 0)
    if (temLiterata && temMontserrat) {
      await document.fonts.ready
      document.documentElement.dataset.fontes = 'ok'
      cutucarCamposDeLacuna()
      fontesProntas.value = true
      return
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  // sem rede na 1ª visita (ou fonte ausente): fica no fallback — que é a
  // mesma stack serifada do PDF, consistente entre prosa e campos
}
if (typeof document !== 'undefined' && document.fonts) ativarLiterata()

export function usePreferencias() { return prefs }
