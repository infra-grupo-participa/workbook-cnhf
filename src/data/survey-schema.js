/* ============================================================
   PESQUISA DE QUALIFICAÇÃO — CNHF (perguntas definitivas)
   Fonte: briefing do Marcio (2026-07-21) + desdobramentos condicionais
   (João Pedro Alves / Victor Hugo, 2026-07-21).
   Porta de entrada do funil: o lead responde e ganha o acesso ao workbook.

   `chart: true` = entra nos gráficos de pizza do dashboard de resultados.
   `revela`      = mapa opção-gatilho → sub-pergunta condicional (id + label).
                   Quando o lead escolhe a opção, o sub-campo (texto) aparece
                   e é salvo no mesmo `answers` (id próprio). Opcional por padrão.
   ============================================================ */
export const SURVEY = [
  { id: 'area', tipo: 'radio', chart: true, obrigatoria: true,
    label: 'Qual a sua área de atuação?',
    opcoes: ['Advocacia', 'Contabilidade', 'Outra'],
    // "Outra" → qual? (se muita gente de outra área entra, é público errado)
    revela: {
      'Outra': { id: 'area_outra', label: 'Qual é a sua área de atuação?',
        placeholder: 'Ex.: administração, corretagem, engenharia...' },
    } },

  { id: 'atua_holding', tipo: 'radio', chart: true, obrigatoria: true,
    label: 'Você atua com Holding Familiar hoje?',
    opcoes: [
      'Não atuo',
      'Já atuo, mas não com um método claro',
      'Já atuo e sigo um método bem definido',
    ],
    // "segue um método" → qual? (identifica o concorrente: Pablo Arruda, Igor…)
    revela: {
      'Já atuo e sigo um método bem definido': { id: 'metodo_qual',
        label: 'Qual método ou curso você segue hoje?',
        placeholder: 'Nome do método, mentor ou curso que você usa' },
    } },

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
]

export const SURVEY_CHART = SURVEY.filter((q) => q.chart)
export const SURVEY_TEXT = SURVEY.filter((q) => q.tipo === 'textarea')
export const questaoLabel = (id) => SURVEY.find((q) => q.id === id)?.label ?? id

// sub-campos condicionais (achatados) — úteis p/ o dashboard mapear labels
export const SURVEY_CONDICIONAIS = SURVEY.flatMap((q) =>
  q.revela ? Object.values(q.revela).map((c) => ({ ...c, parent: q.id })) : []
)
