<script setup>
import { computed, ref } from 'vue'
import ModalBase from './ModalBase.vue'
import ContagemAula from './ContagemAula.vue'
import NotebookPen from '@lucide/vue/dist/esm/icons/notebook-pen.mjs'
import PenLine from '@lucide/vue/dist/esm/icons/pen-line.mjs'
import CalendarClock from '@lucide/vue/dist/esm/icons/calendar-clock.mjs'

/*
  Mini-onboarding do primeiro acesso.

  Motivo de existir: em 11/08/2026, dos 341 alunos que entraram, só 3
  preencheram alguma lacuna. A tela não dizia o que fazer nem para que serve o
  workbook — o aluno chegava e parava ali. São três painéis curtos, o mínimo
  para a pessoa saber o que é isto, como se usa e quando começa.

  Quem fecha por Esc ou pelo X também marca como visto: o modal não pode
  reaparecer a cada login.
*/
const emit = defineEmits(['concluir'])
const base = ref(null)
const passo = ref(0)

const PAINEIS = [
  {
    icone: NotebookPen,
    titulo: 'Este é o seu workbook',
    texto: 'É o caderno digital que acompanha o Curso Nacional de Formação em '
      + 'Holding Familiar. O conteúdo das aulas está aqui, com lacunas para você '
      + 'completar — é o seu material de estudo e de consulta depois.',
  },
  {
    icone: PenLine,
    titulo: 'Você preenche durante a aula',
    texto: 'Acompanhe o Dr. Márcio ao longo da semana do evento e vá preenchendo '
      + 'as lacunas conforme ele explica. Tudo salva sozinho, e você pode voltar '
      + 'de qualquer aparelho usando este mesmo e-mail.',
  },
  {
    icone: CalendarClock,
    titulo: 'Quando começa',
    texto: 'As aulas são ao vivo e não ficam gravadas. Deixe o workbook aberto '
      + 'junto com a transmissão.',
    comContagem: true,
  },
]

const atual = computed(() => PAINEIS[passo.value])
const ultimo = computed(() => passo.value === PAINEIS.length - 1)

function avancar() {
  if (ultimo.value) return base.value?.fechar()
  passo.value += 1
}
/* qualquer forma de sair (botão, X, Esc, backdrop) conta como visto */
function aoFechar() { emit('concluir') }

function abrir() { passo.value = 0; base.value?.abrir() }
defineExpose({ abrir })
</script>

<template>
  <ModalBase ref="base" titulo="Bem-vindo ao seu workbook" :largura="480" @fechar="aoFechar">
    <div class="ob">
      <div class="ob-icone" aria-hidden="true">
        <component :is="atual.icone" :size="26" :stroke-width="1.8" />
      </div>

      <h3 class="ob-titulo">{{ atual.titulo }}</h3>
      <p class="ob-texto">{{ atual.texto }}</p>

      <ContagemAula v-if="atual.comContagem" class="ob-contagem" />

      <div class="ob-rodape">
        <div class="ob-pontos" role="presentation">
          <span v-for="(p, i) in PAINEIS" :key="i"
            class="ob-ponto" :class="{ on: i === passo }"></span>
        </div>
        <button type="button" class="ob-btn" @click="avancar">
          {{ ultimo ? 'Começar' : 'Continuar' }}
        </button>
      </div>
    </div>
  </ModalBase>
</template>

<style scoped>
.ob-icone {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px; height: 52px;
  margin-bottom: 12px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
}
.ob-titulo {
  margin: 0 0 8px;
  font-family: var(--fonte-livro);
  font-size: 20px;
  font-weight: 700;
}
.ob-texto { margin: 0; color: var(--ink-2); font-size: 15px; line-height: 1.6; }
.ob-contagem { margin-top: 16px; }
.ob-rodape {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 22px;
}
.ob-pontos { display: flex; gap: 6px; }
.ob-ponto {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--stroke);
}
.ob-ponto.on { background: var(--accent); }
.ob-btn {
  padding: 11px 22px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}
.ob-btn:hover { filter: brightness(0.95); }
</style>
