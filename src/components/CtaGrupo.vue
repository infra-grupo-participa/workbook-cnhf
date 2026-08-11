<script setup>
import { computed, onMounted, ref } from 'vue'
import { statusGrupo } from '../data/api.js'

/*
  CTA do grupo de WhatsApp por segmento.

  Só aparece para quem NÃO está no grupo — o requisito é não duplicar aluno
  dentro dos grupos. Fail-closed: qualquer erro, timeout ou resposta
  inesperada e o card simplesmente não renderiza (melhor não convidar do que
  convidar quem já está lá dentro).

  O telefone NÃO é pedido ao aluno: ele já vem do cadastro (workbook.leads)
  ou da pesquisa (respostas_pesquisa.telefone) — o servidor consulta as duas
  fontes. Medido em 11/08/2026: só 79 dos 8.255 alunos não têm telefone em
  nenhuma das duas, e para esses mostramos o convite assim mesmo (o custo de
  79 duplicatas possíveis é menor que o de deixar aluno legítimo sem convite).
*/
const link = ref(null)
const area = ref(null)
const carregado = ref(false)

const ROTULO_AREA = {
  Advocacia: 'advogados',
  Contabilidade: 'contadores',
  Outra: 'profissionais',
}
const rotuloGrupo = computed(() => ROTULO_AREA[area.value] || 'profissionais')

onMounted(async () => {
  const r = await statusGrupo()
  // sem link não há CTA: nada de card decorativo que não leva a lugar nenhum
  if (!r.ok || !r.mostrar || !r.link) return
  area.value = r.area
  link.value = r.link
  carregado.value = true
})
</script>

<template>
  <section v-if="carregado" class="card cta-grupo" aria-labelledby="cta-grupo-h">
    <div class="cta-icone" aria-hidden="true">
      <!-- glifo do WhatsApp em SVG: o emoji ✅ renderiza diferente em cada
           sistema (e some em alguns Android antigos); o botão leva o emoji,
           mas o selo do card precisa ser previsível. -->
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" focusable="false">
        <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.09 3.2 5.07 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35Z"/>
        <path d="M12.04 2.5c-5.25 0-9.5 4.25-9.5 9.5 0 1.68.44 3.31 1.28 4.75L2.5 21.5l4.88-1.28a9.46 9.46 0 0 0 4.66 1.21h.01c5.24 0 9.5-4.25 9.5-9.5s-4.26-9.43-9.51-9.43Zm0 17.36h-.01a7.9 7.9 0 0 1-4.02-1.1l-.29-.17-2.9.76.77-2.83-.19-.29a7.86 7.86 0 0 1-1.21-4.23c0-4.36 3.55-7.9 7.91-7.9 2.11 0 4.09.82 5.58 2.32a7.84 7.84 0 0 1 2.31 5.59c0 4.36-3.55 7.85-7.95 7.85Z"/>
      </svg>
    </div>

    <div class="cta-texto">
      <div class="eyebrow">Avisos do curso</div>
      <h2 id="cta-grupo-h">Receba os avisos no WhatsApp</h2>
      <p class="muted">
        É pelo grupo de {{ rotuloGrupo }} que avisamos o horário das lives da Semana de
        Vantagens e tudo o que você não pode perder.
      </p>
    </div>

    <a class="btn zap" :href="link" target="_blank" rel="noopener noreferrer">
      <span class="zap-emoji" aria-hidden="true">💬</span>
      Entrar no grupo de avisos
    </a>
  </section>
</template>

<style scoped>
/*
  Verde do WhatsApp em vez do laranja da marca: aqui o verde não é decoração,
  é sinalização — diz "isto leva para o WhatsApp" antes de o aluno ler o texto.
  Definido localmente (não em styles.css) porque é o único ponto do sistema com
  cor de terceiro; a paleta da marca continua laranja em tudo mais.

  Contrastes medidos (texto do botão é 14px/700 = texto normal, exige 4.5:1):
  branco sobre #0f7a40 = 5.41:1 ✅ · hover #0d6b38 = 6.61:1 ✅
  No tema escuro o botão inverte: tinta #06301a sobre #25d366 = 7.3:1 ✅
  (branco sobre #25d366 daria 1.98:1 e reprovaria).
*/
.cta-grupo {
  --zap: #25d366;
  --zap-btn: #0f7a40;
  --zap-btn-hover: #0d6b38;
  --zap-tint: rgba(37, 211, 102, 0.10);
  --zap-line: rgba(37, 211, 102, 0.38);

  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 16px;
  padding: 18px 22px;
  border-color: var(--zap-line);
  background:
    linear-gradient(90deg, var(--zap-tint), transparent 62%),
    var(--surface);
  overflow: hidden;
}

/* fita verde na borda esquerda: marca o bloco sem gritar */
.cta-grupo::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: linear-gradient(180deg, var(--zap), var(--zap-btn));
}

.cta-icone {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--zap-tint);
  color: var(--zap-btn);
  flex: none;
}

.cta-texto { min-width: 0; }
.cta-grupo h2 {
  font-family: var(--fonte-livro);
  font-size: 18px;
  margin: 3px 0 2px;
  line-height: 1.25;
}
.cta-grupo p {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
  max-width: 52ch;
}

/* botão verde: mesma altura/raio dos .btn do sistema, só a cor muda */
.btn.zap {
  /* <a> sem reset global herda sublinhado e cor de link do navegador, que
     venciam o branco do botão e o faziam parecer um link quebrado. */
  text-decoration: none;
  background: var(--zap-btn);
  border-color: var(--zap-btn);
  color: var(--zap-btn-ink, #fff);
  font-weight: 700;
  white-space: nowrap;
  flex: none;
  padding: 12px 22px;
  box-shadow: 0 2px 10px rgba(15, 122, 64, 0.28);
}
.btn.zap:hover,
.btn.zap:focus,
.btn.zap:active,
.btn.zap:visited {
  color: var(--zap-btn-ink, #fff);
  text-decoration: none;
}
.btn.zap:hover {
  background: var(--zap-btn-hover);
  border-color: var(--zap-btn-hover);
  box-shadow: 0 3px 14px rgba(15, 122, 64, 0.34);
}
/* SEM :focus-visible próprio: o anel global (styles.css, --resposta) tem
   contraste bom nos 3 temas. Um anel verde sobre o card verde media 1.98:1
   no claro e 1.75:1 no sépia — abaixo dos 3:1 de indicador não-textual. */

/* sépia e escuro: o tint precisa de menos opacidade para não sujar o papel,
   e o botão clareia para manter contraste sobre fundo escuro */
:root[data-theme='sepia'] .cta-grupo { --zap-tint: rgba(37, 211, 102, 0.13); }
:root[data-theme='dark'] .cta-grupo {
  --zap-tint: rgba(37, 211, 102, 0.14);
  --zap-btn: #25d366;
  --zap-btn-hover: #3ee07c;
  /* no escuro o verde precisa ficar claro para se destacar do fundo, e aí
     texto branco reprova no WCAG (1.98:1). A tinta escura sobre o verde vivo
     dá ~7.3:1 — é a mesma inversão que o WhatsApp usa no próprio app. */
  --zap-btn-ink: #06301a;
}
:root[data-theme='dark'] .cta-icone { color: var(--zap); }

@media (max-width: 680px) {
  .cta-grupo {
    grid-template-columns: auto 1fr;
    gap: 12px 14px;
    padding: 16px 18px;
  }
  .cta-grupo p { font-size: 13px; }
  /* o botão desce para a linha de baixo e ocupa a largura toda:
     alvo de toque generoso, sem apertar o texto ao lado */
  .btn.zap { grid-column: 1 / -1; width: 100%; margin-top: 2px; }
}

@media (prefers-reduced-motion: reduce) {
  .btn.zap { transition: none; }
}
</style>
