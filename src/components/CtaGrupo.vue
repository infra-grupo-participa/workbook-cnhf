<script setup>
import { computed, onMounted, ref } from 'vue'
import { statusGrupo, informarTelefoneGrupo } from '../data/api.js'

// null = ainda carregando / nada a mostrar (fail-closed); string = rótulo
const link = ref(null)
const area = ref(null)
const precisaTelefone = ref(false)
const carregado = ref(false) // só passou a existir depois de confirmar mostrar:true
const jaEstava = ref(false)

const telefone = ref('')
const enviando = ref(false)
const erroEnvio = ref('')

const ROTULO_AREA = { Advocacia: 'advogados', Contabilidade: 'contadores', Outra: 'profissionais do curso' }
const rotuloGrupo = computed(() => ROTULO_AREA[area.value] || 'profissionais do curso')

const MSG_GENERICA = 'Não foi possível confirmar seu WhatsApp agora. Tente novamente em instantes.'
const MSG_POR_CODIGO = {
  INVALID: 'Digite um WhatsApp válido, com DDD.',
  RATE_LIMIT: 'Muitas tentativas. Aguarde alguns minutos antes de tentar de novo.',
}

onMounted(async () => {
  const r = await statusGrupo()
  if (!r.ok || !r.mostrar) return // fail-closed: nada renderiza
  area.value = r.area
  precisaTelefone.value = !!r.precisaTelefone
  link.value = r.link
  carregado.value = true
})

async function enviarTelefone() {
  const v = telefone.value.trim()
  if (!v || enviando.value) return
  enviando.value = true
  erroEnvio.value = ''
  const r = await informarTelefoneGrupo(v)
  enviando.value = false
  if (!r.ok) {
    erroEnvio.value = r.mensagem || MSG_POR_CODIGO[r.code] || MSG_GENERICA
    return
  }
  if (r.jaEstava) {
    jaEstava.value = true
    precisaTelefone.value = false
    link.value = null
    return
  }
  if (r.mostrar && r.link) {
    precisaTelefone.value = false
    link.value = r.link
  } else {
    // servidor confirmou o telefone mas não liberou link nem sinalizou
    // que já estava no grupo — melhor não mostrar nada do que arriscar duplicar.
    carregado.value = false
  }
}
</script>

<template>
  <section v-if="carregado" class="card cta-grupo" aria-labelledby="cta-grupo-h">
    <div class="eyebrow">Comunidade</div>

    <template v-if="jaEstava">
      <p class="muted ja-estava">Você já está no grupo. 🙂</p>
    </template>

    <template v-else>
      <h2 id="cta-grupo-h">Entre no grupo do WhatsApp</h2>
      <p class="muted">
        Um espaço só de {{ rotuloGrupo }} do curso, para trocar experiências e tirar dúvidas entre as aulas.
      </p>

      <a v-if="link" class="btn primary" :href="link" target="_blank" rel="noopener noreferrer">
        Entrar no grupo
      </a>

      <form v-else-if="precisaTelefone" class="tel-form" @submit.prevent="enviarTelefone">
        <label class="field" for="cta-grupo-telefone">
          <span>Seu WhatsApp</span>
          <input
            id="cta-grupo-telefone" type="tel" v-model="telefone"
            placeholder="(11) 99999-9999" inputmode="tel" autocomplete="tel"
            required :disabled="enviando"
          />
        </label>
        <p v-if="erroEnvio" class="alert bad" role="alert">{{ erroEnvio }}</p>
        <button class="btn primary" type="submit" :disabled="enviando || !telefone.trim()">
          {{ enviando ? 'Enviando…' : 'Continuar' }}
        </button>
      </form>
    </template>
  </section>
</template>

<style scoped>
.cta-grupo { padding: 20px 24px; display: flex; flex-direction: column; gap: 10px; }
.cta-grupo h2 { font-family: var(--fonte-livro); font-size: 19px; margin: 2px 0 0; }
.cta-grupo p { margin: 0; font-size: 14px; line-height: 1.55; max-width: 560px; }
.cta-grupo .btn { align-self: flex-start; margin-top: 4px; }
.ja-estava { font-size: 14px; }

.tel-form { display: flex; flex-direction: column; gap: 10px; max-width: 320px; margin-top: 4px; }
.tel-form .btn { align-self: flex-start; }

@media (max-width: 680px) {
  .cta-grupo { text-align: center; align-items: center; }
  .cta-grupo p { max-width: none; }
  .tel-form { max-width: none; width: 100%; align-items: stretch; }
  .tel-form .btn, .cta-grupo > .btn { align-self: stretch; }
}
</style>
