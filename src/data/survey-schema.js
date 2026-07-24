/* ============================================================
   PESQUISA DE QUALIFICAÇÃO — CNHF (perguntas + nós condicionais)
   Fonte: briefing do Marcio + desdobramentos (João Pedro / Victor Hugo) +
   nós de "raiz do lead" (Marcio, 2026-07-21).
   Porta de entrada do funil: o lead responde e ganha o acesso ao workbook.

   Objetivo dos nós: entender a RAIZ de cada lead (como/onde se formou, o que
   já sabe) SEM citar nomes de concorrentes — categorias abertas e padronizadas
   para o dashboard metrificar de forma dinâmica (quantos de cada tipo).

   `chart: true` = entra nos gráficos de pizza do dashboard.
   `revela`      = mapa opção-gatilho → sub-pergunta condicional. A sub-pergunta
                   pode ser:
                     { id, label, tipo:'texto', placeholder, obrigatoria }
                     { id, label, tipo:'radio', opcoes:[...], obrigatoria, chart }
                   Salva no mesmo `answers` (id próprio). Só UM nível de
                   profundidade (uma sub-pergunta por opção-gatilho).
   ============================================================ */
export const SURVEY = [
  // Profissão (era "área de atuação"). Sem nó: não perguntamos mais QUAL
  // profissão quando marca "Outra" (decisão do Marcio, 2026-07-23). id
  // mantido como 'area' p/ não quebrar dashboard/health/espelhamento.
  { id: 'area', tipo: 'radio', chart: true, obrigatoria: true,
    label: 'Qual a sua profissão?',
    opcoes: ['Advocacia', 'Contabilidade', 'Outra'] },

  { id: 'faturamento', tipo: 'radio', chart: true, obrigatoria: true,
    label: 'Qual o seu faturamento mensal estimado?',
    opcoes: ['Até R$ 5 mil', 'R$ 5 a 15 mil', 'R$ 15 a 30 mil', 'Acima de R$ 30 mil'] },

  { id: 'objetivo', tipo: 'radio', chart: true, obrigatoria: true,
    label: 'Qual o seu principal objetivo com o Curso Nacional?',
    opcoes: [
      'Criar uma nova fonte de receita',
      'Me aprofundar tecnicamente',
      'Atender um cliente que já tenho',
      'Ainda estou explorando',
    ] },

  { id: 'dificuldade', tipo: 'textarea', chart: false, obrigatoria: true,
    label: 'Qual a sua maior dificuldade ou dúvida com Holding Familiar hoje?',
    placeholder: 'Escreve com as suas palavras...' },

  // Nova (Marcio, 2026-07-23): a dificuldade percebida para COMEÇAR — pedida
  // "antes do pitch". Texto aberto, entra na varredura de dor (nao_sabe_comecar).
  { id: 'dificuldade_comecar', tipo: 'textarea', chart: false, obrigatoria: true,
    label: 'Qual dificuldade você acredita que terá para começar a trabalhar com Holding Familiar?',
    placeholder: 'Escreve com as suas palavras...' },
]

export const SURVEY_CHART = SURVEY.filter((q) => q.chart)
export const SURVEY_TEXT = SURVEY.filter((q) => q.tipo === 'textarea')
export const questaoLabel = (id) => SURVEY.find((q) => q.id === id)?.label ?? id

// sub-campos condicionais (achatados) — úteis p/ o dashboard mapear labels e
// para os gráficos dinâmicos (os que têm chart:true também viram pizza).
export const SURVEY_CONDICIONAIS = SURVEY.flatMap((q) =>
  q.revela ? Object.values(q.revela).map((c) => ({ ...c, parent: q.id })) : []
)
// dedup por id (origem_cliente aparece em 2 gatilhos com o mesmo id)
const _vistos = new Set()
export const SURVEY_CONDICIONAIS_UNICOS = SURVEY_CONDICIONAIS.filter((c) => {
  if (_vistos.has(c.id)) return false
  _vistos.add(c.id); return true
})
