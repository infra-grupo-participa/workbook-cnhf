/* ============================================================
   PESQUISA DE QUALIFICAÇÃO — CNHF (perguntas definitivas)
   Fonte: briefing do Marcio (2026-07-21). Pesquisa curta, é a
   PORTA DE ENTRADA do funil: o lead responde e ganha o acesso
   ao workbook (senha exibida no modal após finalizar).
   `chart: true` = entra nos gráficos de pizza do dashboard de resultados.
   ============================================================ */
export const SURVEY = [
  { id: 'area', tipo: 'radio', chart: true, obrigatoria: true,
    label: 'Qual a sua área de atuação?',
    opcoes: ['Advocacia', 'Contabilidade', 'Outra'] },

  { id: 'atua_holding', tipo: 'radio', chart: true, obrigatoria: true,
    label: 'Você atua com Holding Familiar hoje?',
    opcoes: [
      'Não atuo',
      'Já atuo, mas não com um método claro',
      'Já atuo e sigo um método bem definido',
    ] },

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
