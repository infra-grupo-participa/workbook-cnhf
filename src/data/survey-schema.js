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
   `ajuda`       = subtexto opcional exibido sob o label (contexto/exemplos).
                   Não vai pro dashboard — é só apresentação.

   INVARIANTES (2026-07-27): os `id` e as `opcoes` de campos chart:true são
   contrato com o dashboard, o health.js e o CRM — NUNCA mudar. `label`,
   `ajuda` e `placeholder` são livres.
   ============================================================ */
export const SURVEY = [
  // 1. Profissão (era "área de atuação"). Opções fixas → gráfico + mapeia o
  // enum de profissão no dashboard/CRM. id mantido como 'area' p/ não quebrar
  // dashboard/health/espelhamento.
  { id: 'area', tipo: 'radio', chart: true, obrigatoria: true,
    label: 'Qual é a sua profissão?',
    opcoes: ['Advocacia', 'Contabilidade', 'Outra'] },

  // 2. Faturamento (dado objetivo; alimenta a flag prioridade_faturamento >30k).
  { id: 'faturamento', tipo: 'radio', chart: true, obrigatoria: true,
    label: 'Qual o seu faturamento mensal estimado?',
    opcoes: ['Até R$ 5 mil', 'R$ 5 a 15 mil', 'R$ 15 a 30 mil', 'Acima de R$ 30 mil'] },

  // 3. Dificuldade profissional / carreira (aberta).
  { id: 'dificuldade', tipo: 'textarea', chart: false, obrigatoria: true,
    label: 'Qual é a maior dificuldade profissional que você enfrenta hoje?',
    ajuda: 'Pode ser sobre clientes, honorários, rotina, posicionamento — o que mais pesa no seu dia a dia.',
    placeholder: 'Escreva com as suas palavras...' },

  // 4. Obstáculo p/ tornar a holding familiar a PRINCIPAL área de atuação (aberta).
  // OPCIONAL (2026-07-26): reduzir atrito — só a 1ª aberta (dificuldade) é obrigatória.
  { id: 'dificuldade_holding_principal', tipo: 'textarea', chart: false, obrigatoria: false,
    label: 'O que pode te impedir de fazer da Holding Familiar a sua principal área de atuação?',
    ajuda: 'Dificuldade técnica, comercial, de tempo... o que vier primeiro à cabeça.',
    placeholder: 'Escreva com as suas palavras...' },

  // 5. "Mundo dos sonhos": o que a carreira deveria entregar e ainda não entrega (aberta). OPCIONAL.
  { id: 'mundo_sonhos', tipo: 'textarea', chart: false, obrigatoria: false,
    label: 'No seu mundo dos sonhos, o que a sua carreira estaria te entregando que ainda não entrega?',
    ajuda: 'Renda, reconhecimento, liberdade de agenda — sonhe sem medo.',
    placeholder: 'Escreva com as suas palavras...' },

  // 6. (antes do pitch) dificuldade percebida para COMEÇAR. Entra na varredura
  // de dor (nao_sabe_comecar). Fecha a pesquisa. OPCIONAL.
  { id: 'dificuldade_comecar', tipo: 'textarea', chart: false, obrigatoria: false,
    label: 'Qual dificuldade você acredita que terá para começar a trabalhar com Holding Familiar?',
    placeholder: 'Escreva com as suas palavras...' },
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
