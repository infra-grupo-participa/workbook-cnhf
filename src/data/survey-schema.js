/* ============================================================
   PESQUISA DE QUALIFICAÇÃO — perguntas (fonte: Concepção de Lançamento)
   Concepção pede pesquisa curta, só o que a gente vai usar:
   idade, gênero, pior problema da carreira, o que gostaria que mudasse,
   + qualificação de MQL (profissão, tempo, experiência, faturamento).
   `chart: true` = entra nos gráficos de pizza do dashboard de resultados.
   ============================================================ */
export const SURVEY = [
  { id: 'profissao', tipo: 'radio', chart: true, obrigatoria: true,
    label: 'Qual a sua profissão?',
    opcoes: ['Advogado(a)', 'Contador(a)', 'Outra'] },

  { id: 'idade', tipo: 'radio', chart: true, obrigatoria: true,
    label: 'Qual a sua faixa de idade?',
    opcoes: ['Até 29 anos', '30 a 39', '40 a 49', '50 ou mais'] },

  { id: 'genero', tipo: 'radio', chart: true, obrigatoria: true,
    label: 'Gênero',
    opcoes: ['Masculino', 'Feminino', 'Prefiro não informar'] },

  { id: 'tempo', tipo: 'radio', chart: true, obrigatoria: true,
    label: 'Há quanto tempo você atua na sua profissão?',
    opcoes: ['Menos de 2 anos', '2 a 5 anos', '5 a 10 anos', 'Mais de 10 anos'] },

  { id: 'holding', tipo: 'radio', chart: true, obrigatoria: true,
    label: 'Você já estruturou uma Holding Familiar para algum cliente?',
    opcoes: ['Nunca', '1 a 2', '3 ou mais'] },

  { id: 'faturamento', tipo: 'radio', chart: true, obrigatoria: true,
    label: 'Qual a sua faixa de faturamento mensal hoje como profissional?',
    opcoes: ['Até R$ 5 mil', 'R$ 5 a 15 mil', 'R$ 15 a 30 mil', 'Acima de R$ 30 mil'] },

  { id: 'problema', tipo: 'textarea', chart: false, obrigatoria: true,
    label: 'Qual o pior problema da sua carreira hoje?',
    placeholder: 'Escreve com as suas palavras...' },

  { id: 'mudanca', tipo: 'textarea', chart: false, obrigatoria: true,
    label: 'O que você gostaria que mudasse na sua carreira nos próximos 12 meses?',
    placeholder: 'Escreve com as suas palavras...' },
]

export const SURVEY_CHART = SURVEY.filter((q) => q.chart)
export const SURVEY_TEXT = SURVEY.filter((q) => q.tipo === 'textarea')
export const questaoLabel = (id) => SURVEY.find((q) => q.id === id)?.label ?? id
