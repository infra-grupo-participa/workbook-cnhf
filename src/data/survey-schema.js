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
  { id: 'area', tipo: 'radio', chart: true, obrigatoria: true,
    label: 'Qual a sua área de atuação?',
    opcoes: ['Advocacia', 'Contabilidade', 'Outra'],
    revela: {
      // "Outra" → qual? (se muita gente de outra área entra, é público errado)
      'Outra': { id: 'area_outra', tipo: 'texto', obrigatoria: true,
        label: 'Qual é a sua área de atuação?',
        placeholder: 'Ex.: administração, corretagem, engenharia...' },
    } },

  { id: 'formacao_holding', tipo: 'radio', chart: true, obrigatoria: true,
    label: 'Você já tem alguma formação ou estudo sobre Holding Familiar?',
    opcoes: [
      'Nunca estudei sobre isso',
      'Estudei por conta própria',
      'Já fiz algum curso ou formação',
    ],
    revela: {
      // já tem formação → conhecer a RAIZ: onde/como aprendeu (categorias abertas)
      'Já fiz algum curso ou formação': {
        id: 'formacao_origem', tipo: 'radio', chart: true, obrigatoria: true,
        label: 'Onde você teve essa formação sobre Holding Familiar?',
        opcoes: [
          'Mentoria ou curso pago',
          'Faculdade ou pós-graduação',
          'Curso online ou conteúdo gratuito',
          'Aprendi na prática, no dia a dia',
          'Outro',
        ] },
      'Estudei por conta própria': {
        id: 'estudo_como', tipo: 'radio', chart: true, obrigatoria: true,
        label: 'Como você tem estudado sobre Holding Familiar?',
        opcoes: [
          'Vídeos e conteúdos gratuitos',
          'Livros e materiais técnicos',
          'Conversando com colegas da área',
          'Na prática, com meus próprios casos',
          'Outro',
        ] },
    } },

  { id: 'atua_holding', tipo: 'radio', chart: true, obrigatoria: true,
    label: 'Você atua com Holding Familiar hoje?',
    opcoes: [
      'Não atuo',
      'Já atuo, mas não com um método claro',
      'Já atuo e sigo um método bem definido',
    ],
    revela: {
      // já atua com método → há quanto tempo? (maturidade, sem citar nomes)
      'Já atuo e sigo um método bem definido': {
        id: 'atua_tempo', tipo: 'radio', chart: true, obrigatoria: true,
        label: 'Há quanto tempo você atua com Holding Familiar?',
        opcoes: [
          'Menos de 1 ano',
          'De 1 a 3 anos',
          'Mais de 3 anos',
        ] },
    } },

  { id: 'quantos_clientes', tipo: 'radio', chart: true, obrigatoria: true,
    label: 'Quantas Holdings Familiares você já estruturou para clientes?',
    opcoes: ['Nenhuma ainda', 'De 1 a 3', 'De 4 a 10', 'Mais de 10'],
    revela: {
      // já estruturou → como chega esse cliente hoje? (origem de demanda)
      'De 4 a 10': {
        id: 'origem_cliente', tipo: 'radio', chart: true, obrigatoria: true,
        label: 'De onde vêm a maioria dos seus clientes de Holding?',
        opcoes: ['Indicação', 'Marketing/redes sociais', 'Minha carteira atual', 'Outro'] },
      'Mais de 10': {
        id: 'origem_cliente', tipo: 'radio', chart: true, obrigatoria: true,
        label: 'De onde vêm a maioria dos seus clientes de Holding?',
        opcoes: ['Indicação', 'Marketing/redes sociais', 'Minha carteira atual', 'Outro'] },
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
