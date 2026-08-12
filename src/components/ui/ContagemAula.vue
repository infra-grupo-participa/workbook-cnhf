<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import CalendarClock from '@lucide/vue/dist/esm/icons/calendar-clock.mjs'
import Radio from '@lucide/vue/dist/esm/icons/radio.mjs'
import { estadoEvento, formatarRestante, dataPorExtenso } from '../../data/evento.js'

/*
  Contagem regressiva até a próxima aula ao vivo.

  O estado 'ao-vivo' é o que realmente importa: em 11/08/2026, dos 341 alunos
  que entraram no sistema só 3 preencheram alguma lacuna. A aula acontecendo é
  o único momento em que o preenchimento faz sentido, então é nele que o card
  vira um convite direto para abrir o workbook.

  Terminadas as aulas o contador some — nada de número negativo nem card órfão.
*/
const router = useRouter()
const agora = ref(new Date())
let timer = null

/* aba oculta não precisa de tick: o relógio é recalculado ao voltar. */
function ligar() {
  if (timer) return
  timer = setInterval(() => { agora.value = new Date() }, 1000)
}
function desligar() {
  if (!timer) return
  clearInterval(timer)
  timer = null
}
function aoMudarVisibilidade() {
  if (document.hidden) return desligar()
  agora.value = new Date()
  ligar()
}

onMounted(() => {
  ligar()
  document.addEventListener('visibilitychange', aoMudarVisibilidade)
})
onUnmounted(() => {
  desligar()
  document.removeEventListener('visibilitychange', aoMudarVisibilidade)
})

const estado = computed(() => estadoEvento(agora.value))
const restante = computed(() =>
  estado.value.fase === 'antes' ? formatarRestante(estado.value.faltam) : '')
const quando = computed(() =>
  estado.value.fase === 'antes' ? dataPorExtenso(estado.value.proxima.inicio) : '')

function abrirWorkbook() { router.push({ name: 'workbook' }) }
</script>

<template>
  <!-- ao vivo: o aluno tem que estar com o caderno aberto agora -->
  <section v-if="estado.fase === 'ao-vivo'" class="ca ca-vivo">
    <div class="ca-topo">
      <span class="ca-pulso" aria-hidden="true"></span>
      <Radio :size="18" :stroke-width="2" aria-hidden="true" />
      <strong>Ao vivo agora &middot; Aula {{ estado.atual.n }}</strong>
    </div>
    <p class="ca-txt">
      Acompanhe o Dr. Márcio com o seu workbook aberto e vá preenchendo as
      lacunas durante a aula.
    </p>
    <button type="button" class="ca-btn" @click="abrirWorkbook">
      Abrir meu workbook
    </button>
  </section>

  <!-- antes: contagem regressiva -->
  <section v-else-if="estado.fase === 'antes'" class="ca">
    <div class="ca-topo">
      <CalendarClock :size="18" :stroke-width="2" aria-hidden="true" />
      <strong>Aula {{ estado.proxima.n }}</strong>
    </div>
    <p class="ca-conta" aria-live="off">{{ restante }}</p>
    <p class="ca-quando">{{ quando }}</p>
  </section>

  <!-- depois da última: nada de contador negativo -->
  <section v-else class="ca">
    <div class="ca-topo">
      <CalendarClock :size="18" :stroke-width="2" aria-hidden="true" />
      <strong>As aulas terminaram</strong>
    </div>
    <p class="ca-txt">
      O seu workbook continua disponível para consulta e para você terminar de
      preencher.
    </p>
  </section>
</template>

<style scoped>
.ca {
  border: 1px solid var(--stroke);
  border-radius: var(--radius);
  background: var(--surface);
  padding: 16px 18px;
}
.ca-topo {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ink-2);
  font-size: 14px;
}
.ca-topo strong { color: var(--ink); font-weight: 700; }
.ca-conta {
  margin: 8px 0 2px;
  font-family: var(--fonte-livro);
  font-size: 30px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.5px;
}
.ca-quando { margin: 0; color: var(--ink-2); font-size: 14px; }
.ca-txt { margin: 8px 0 0; color: var(--ink-2); font-size: 14px; line-height: 1.5; }

/* ao vivo ganha destaque — é o momento de agir */
.ca-vivo { border-color: var(--accent); background: var(--accent-soft); }
.ca-vivo .ca-topo { color: var(--accent-ink, var(--ink)); }
.ca-pulso {
  width: 9px; height: 9px;
  border-radius: 50%;
  background: #c0392b;
  animation: ca-pisca 1.6s ease-in-out infinite;
}
@keyframes ca-pisca { 0%, 100% { opacity: 1 } 50% { opacity: 0.25 } }
@media (prefers-reduced-motion: reduce) {
  .ca-pulso { animation: none }
}
.ca-btn {
  margin-top: 12px;
  padding: 11px 18px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}
.ca-btn:hover { filter: brightness(0.95); }
</style>
