// workbook-content.js — FONTE ÚNICA do Workbook de acompanhamento CNHF
// Gerado a partir de "HOLDING TOTAL JULHO 2026 + EXTRAS - TRANSCRIÇÃO LIMPA.pdf".
// Alimenta tanto o preenchimento digital quanto o PDF-livro.
// Tipos de bloco:
//   prosa          -> texto fixo (contexto da apostila)
//   subtitulo      -> subtítulo interno da seção
//   lacuna         -> campo de preenchimento do aluno (id estável, `linhas` = altura)
//   citacao-legal  -> lacuna precedida de rótulo legal (rotulo: "CC, Art.", "STF, Tema"...)
// tamanho: 'linha' | 'curto' | 'paragrafo' (controla altura do campo/espaço no PDF)
// Total de lacunas: 149

export const ANCORA = "Holding Familiar é método, não é improviso!"

export const WORKBOOK = [
  {
    "id": "cap-1",
    "tipo": "capitulo",
    "numero": 1,
    "titulo": "Conceito",
    "ancora": true,
    "total_lacunas": 16,
    "blocos": [
      {
        "tipo": "prosa",
        "texto": "O vocábulo holding deriva do verbo inglês to hold , cuja tradução corrente por \"segurar\" conduziu ao equívoco de supor que a Holding seria, por definição, sociedade controladora. A conclusão é falsa: uma sociedade investidora-anjo que adquire quarenta e nove por cento de três empreendimentos distintos, permanecendo cada empreendedor original com cinquenta e um por cento, é inequivocamente uma Holding e não exerce controle em nenhum deles. Controle e Holding são conceitos autônomos, e a distinção corresponde ao art."
      },
      {
        "tipo": "lacuna",
        "id": "cap-1-l1",
        "linhas": 1,
        "tamanho": "linha",
        "sufixo": ","
      },
      {
        "tipo": "prosa",
        "texto": "que define acionista controlador por critérios de preponderância nas deliberações e poder de eleger a maioria dos administradores, requisitos que não se confundem com a mera titularidade de participação. A tradução adequada de to hold é"
      },
      {
        "tipo": "lacuna",
        "id": "cap-1-l2",
        "linhas": 1,
        "tamanho": "linha",
        "sufixo": ","
      },
      {
        "tipo": "prosa",
        "texto": "como em"
      },
      {
        "tipo": "lacuna",
        "id": "cap-1-l3",
        "linhas": 1,
        "tamanho": "linha",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "Fixa-se, portanto, o conceito:"
      },
      {
        "tipo": "lacuna",
        "id": "cap-1-l4",
        "linhas": 1,
        "tamanho": "linha",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "Portar participação societária não constitui, em sentido próprio, atividade econômica. Ser sócio é condição jurídica, não atividade: o sócio da indústria alimentícia não exerce, por essa condição, atividade de industrialização. Daí surge um obstáculo legal, pois o art."
      },
      {
        "tipo": "lacuna",
        "id": "cap-1-l5",
        "linhas": 1,
        "tamanho": "linha"
      },
      {
        "tipo": "prosa",
        "texto": "condiciona a existência do contrato de sociedade ao"
      },
      {
        "tipo": "lacuna",
        "id": "cap-1-l6",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "citacao-legal",
        "id": "cap-1-l7",
        "rotulo": "CC, Art.",
        "linhas": 5,
        "tamanho": "paragrafo"
      },
      {
        "tipo": "prosa",
        "texto": "A superação desse obstáculo ocorreu"
      },
      {
        "tipo": "lacuna",
        "id": "cap-1-l8",
        "linhas": 1,
        "tamanho": "linha",
        "sufixo": ","
      },
      {
        "tipo": "prosa",
        "texto": "por via jurisprudencial própria do"
      },
      {
        "tipo": "lacuna",
        "id": "cap-1-l9",
        "linhas": 1,
        "tamanho": "linha",
        "sufixo": ","
      },
      {
        "tipo": "prosa",
        "texto": "diante da necessidade de que pessoas jurídicas investissem em outras pessoas jurídicas para viabilizar aportes de capital em escala industrial. Migrou para os"
      },
      {
        "tipo": "lacuna",
        "id": "cap-1-l10",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": ","
      },
      {
        "tipo": "prosa",
        "texto": "o primeiro tratamento legislativo, autorizando expressamente as sociedades a deter participação em outras companhias. No Brasil, não pertencente ao common law , era necessária lei, e o instituto ingressou pela"
      },
      {
        "tipo": "lacuna",
        "id": "cap-1-l11",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "citacao-legal",
        "id": "cap-1-l12",
        "rotulo": "Lei",
        "linhas": 6,
        "tamanho": "paragrafo"
      },
      {
        "tipo": "prosa",
        "texto": "Desde que o contrato social contenha a previsão de regência supletiva, o regime das sociedades por ações estende-se à limitada, e com ele a faculdade de deter participação. O efeito da norma é a criação de uma"
      },
      {
        "tipo": "lacuna",
        "id": "cap-1-l13",
        "linhas": 1,
        "tamanho": "linha",
        "sufixo": ":"
      },
      {
        "tipo": "prosa",
        "texto": "a lei converteu a participação societária em atividade econômica por determinação normativa, e não no plano dos fatos. Admite-se, assim, sociedade que não desenvolve operação alguma, não produz, não comercializa e não presta serviços, cujo objeto se exaure na titularidade de participações. É a"
      },
      {
        "tipo": "lacuna",
        "id": "cap-1-l14",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": ","
      },
      {
        "tipo": "prosa",
        "texto": "e a doutrina distingue a holding pura, cujo objeto se limita à participação, da holding mista, que agrega atividade operacional própria. Sobre esse fundamento constrói-se a Holding Familiar. A qualificação \"familiar\" não descreve a composição do quadro societário, isto é, não se trata de Holding cujos sócios são membros de uma mesma família. O que se aproveita é a peculiaridade normativa: se a lei admite sociedade que não opera, admite pessoa jurídica desprovida de risco econômico, porque todo risco econômico deriva da atividade econômica, e a sociedade de participações, autorizada a existir sem operar, é ente inerte e apartado do risco. A construção não se reduz a uma sociedade: pode compreender uma, duas, três ou tantas células quantas exija a realidade patrimonial da família. Trata-se, portanto, de"
      },
      {
        "tipo": "lacuna",
        "id": "cap-1-l15",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": ","
      },
      {
        "tipo": "prosa",
        "texto": "e não unidade de negócio autônoma. A designação \"empresa\" evoca operação, faturamento e funcionamento, atributos que não correspondem à natureza dessas sociedades; \"célula\" comunica componente funcional inserido em estrutura maior. Do exposto extrai-se a definição adotada:"
      },
      {
        "tipo": "lacuna",
        "id": "cap-1-l16",
        "linhas": 4,
        "tamanho": "paragrafo",
        "sufixo": "."
      }
    ]
  },
  {
    "id": "cap-2",
    "tipo": "capitulo",
    "numero": 2,
    "titulo": "Aplicações práticas",
    "ancora": true,
    "total_lacunas": 11,
    "blocos": [
      {
        "tipo": "prosa",
        "texto": "O conceito, isoladamente, habilita ao debate acadêmico, não ao exercício profissional. Este pressupõe identificar as hipóteses concretas em que a Holding Familiar constitui solução adequada. Sistematizam-se sete, em ordem de atualidade. Tributação de dividendos. A Lei 9.250/95, alterada pela Lei 15.270/2025, passou a sujeitar à retenção na fonte os dividendos distribuídos a pessoa física."
      },
      {
        "tipo": "citacao-legal",
        "id": "cap-2-l1",
        "rotulo": "Lei",
        "linhas": 6,
        "tamanho": "paragrafo"
      },
      {
        "tipo": "prosa",
        "texto": "Dividendos excedentes a cinquenta mil reais mensais sofrem retenção de dez por cento. A Holding Familiar interpõe célula controladora entre a sociedade operacional e a pessoa natural: à pessoa física destina-se apenas o necessário à subsistência, mantido abaixo do limiar legal, e o excedente permanece na controladora, onde não incide a retenção, que se dirige à pessoa física. O montante retido destina-se à célula cofre. É viciosa a configuração em que a controladora custeia diretamente despesas pessoais do titular, pois desnatura o arranjo e expõe o cliente; a separação entre esfera pessoal e institucional deve ser rigorosa. Majoração da base de cálculo do lucro presumido. A Lei Complementar 224/2025 reduziu incentivos federais e classificou entre eles o lucro presumido, determinando acréscimo de dez por cento sobre os percentuais de presunção. Prestadora de serviços com presunção de trinta e dois por cento mantém esse percentual até cinco milhões de reais de receita; ultrapassado o limite, passa a trinta e cinco por cento na prática. A solução emprega"
      },
      {
        "tipo": "lacuna",
        "id": "cap-2-l2",
        "linhas": 4,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A análise pode revelar configuração distinta, em que a concentração de despesa em unidade sujeita ao lucro real neutraliza a carga sobre aquela parcela. Não há configuração padrão: há análise, e da análise decorre desenho. Tributação dos aluguéis. A alíquota de vinte e sete vírgula cinco por cento sobre locação percebida por pessoa natural sempre foi expressiva, mas a gravidade era mitigada pela negligência no cumprimento. Essa circunstância deixou de subsistir com a reforma tributária, que instituiu, ao lado do IBS e da CBS, o Cadastro Imobiliário Brasileiro, permitindo identificar a ocupação de cada unidade. Não declarada a locação, presume-se ocupação gratuita, que produz consequência tributária para o ocupante, o qual exigirá a formalização para viabilizar dedução própria. Acrescida a incidência do IBS e da CBS, a carga total aproxima-se de trinta e seis por cento. A solução emprega"
      },
      {
        "tipo": "lacuna",
        "id": "cap-2-l3",
        "linhas": 3,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "Estruturação de negócios. A Holding funciona como"
      },
      {
        "tipo": "lacuna",
        "id": "cap-2-l4",
        "linhas": 5,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "O vício que se afasta é estrutural: não depende da efetiva coligação, bastando sua possibilidade jurídica para comprometer a previsibilidade do arranjo, valor autônomo em estruturação patrimonial. Preservação de legado. Categoria de cliente cuja demanda é existencial: o empreendedor que construiu patrimônio significativo e se depara com a ausência de continuidade geracional. Constitui-se"
      },
      {
        "tipo": "lacuna",
        "id": "cap-2-l5",
        "linhas": 5,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "Opera-se uma reconstrução de premissa: a continuidade do legado não exige o exercício da atividade operacional, mas o exercício da condição de sócio, porque sócio é tomador de decisão, não operador. A hipótese aplica-se com particular intensidade a herdeiros radicados no exterior. Proteção patrimonial. Separam-se dois campos: de um lado a atividade empresarial e seus riscos, tendo o cliente como gestor; de outro, o patrimônio familiar alocado em célula cofre, sem vinculação aos riscos do insucesso empresarial. A barreira pode ser amplificada mediante sociedade anônima de capital fechado na posição de controladora, em razão do regime de responsabilidade:"
      },
      {
        "tipo": "lacuna",
        "id": "cap-2-l6",
        "linhas": 4,
        "tamanho": "paragrafo",
        "sufixo": ")."
      },
      {
        "tipo": "prosa",
        "texto": "Impõe-se advertência que não comporta atenuação: a eficácia depende"
      },
      {
        "tipo": "lacuna",
        "id": "cap-2-l7",
        "linhas": 3,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A Holding Familiar não é instrumento de subtração de patrimônio à execução em curso, não se presta a fraudar credores, e o profissional que assim a empregue incorre em ilícito. Ao devedor já constituído em mora, a solução são os instrumentos próprios de defesa. Supressão do inventário. É a aplicação que produz maior volume de contratação, porque o inventário atinge indistintamente todo titular de patrimônio. Seu custo real excede em muito o ITCMD:"
      },
      {
        "tipo": "lacuna",
        "id": "cap-2-l8",
        "linhas": 8,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A Holding Familiar suprime o inventário por dois mecanismos:"
      },
      {
        "tipo": "lacuna",
        "id": "cap-2-l9",
        "linhas": 5,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "Daí decorre a tese central da obra: a Holding Familiar não constitui"
      },
      {
        "tipo": "lacuna",
        "id": "cap-2-l10",
        "linhas": 3,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "Consequência técnica é a natureza da quota social, que não constitui bem em sentido próprio, mas representa complexo de direitos de repercussão pecuniária, cuja liquidação se opera por apuração de haveres (CC, art. 1.031; CPC, art. 620, § 1º, II), ao passo que a ação constitui o próprio bem pertencente ao acionista. A experiência brasileira confirma a tese: Norberto Odebrecht, Antônio Ermírio de Moraes e Roberto Marinho, com patrimônios"
      },
      {
        "tipo": "lacuna",
        "id": "cap-2-l11",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": "."
      }
    ]
  },
  {
    "id": "cap-3",
    "tipo": "capitulo",
    "numero": 3,
    "titulo": "Montagem da Holding Familiar — célula cofre e institucionalização",
    "ancora": true,
    "total_lacunas": 26,
    "blocos": [
      {
        "tipo": "prosa",
        "texto": "O sistema inicia-se invariavelmente pela célula cofre , sociedade destinada a"
      },
      {
        "tipo": "lacuna",
        "id": "cap-3-l1",
        "linhas": 6,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "Pela mesma razão, o capital social inicial fixa-se em"
      },
      {
        "tipo": "lacuna",
        "id": "cap-3-l2",
        "linhas": 3,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "O objeto social é"
      },
      {
        "tipo": "lacuna",
        "id": "cap-3-l3",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": ","
      },
      {
        "tipo": "prosa",
        "texto": "e no quadro societário da constituição figuram"
      },
      {
        "tipo": "lacuna",
        "id": "cap-3-l4",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A montagem exige o domínio de conceitos elementares de capital social. Subscrição"
      },
      {
        "tipo": "lacuna",
        "id": "cap-3-l5",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": ";"
      },
      {
        "tipo": "prosa",
        "texto": "integralização"
      },
      {
        "tipo": "lacuna",
        "id": "cap-3-l6",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": ";"
      },
      {
        "tipo": "prosa",
        "texto": "e realização"
      },
      {
        "tipo": "lacuna",
        "id": "cap-3-l7",
        "linhas": 3,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A quota comporta três critérios de valoração: o"
      },
      {
        "tipo": "lacuna",
        "id": "cap-3-l8",
        "linhas": 1,
        "tamanho": "linha",
        "sufixo": ","
      },
      {
        "tipo": "prosa",
        "texto": "que consta do contrato social e não se altera pela valorização dos ativos; o valor patrimonial,"
      },
      {
        "tipo": "lacuna",
        "id": "cap-3-l9",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": ";"
      },
      {
        "tipo": "prosa",
        "texto": "e o valor de mercado,"
      },
      {
        "tipo": "lacuna",
        "id": "cap-3-l10",
        "linhas": 3,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A distinção repercute em ITCMD sobre quotas, porque"
      },
      {
        "tipo": "lacuna",
        "id": "cap-3-l11",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "Constituída a célula cofre, inaugura-se a institucionalização do patrimônio , que consiste em"
      },
      {
        "tipo": "lacuna",
        "id": "cap-3-l12",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "O efeito determinante reside na natureza do ente:"
      },
      {
        "tipo": "lacuna",
        "id": "cap-3-l13",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A institucionalização não é etapa acessória, mas o núcleo da montagem:"
      },
      {
        "tipo": "lacuna",
        "id": "cap-3-l14",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "Os bens ingressam no patrimônio da célula por quatro modalidades. A doação"
      },
      {
        "tipo": "lacuna",
        "id": "cap-3-l15",
        "linhas": 4,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A compra e venda é"
      },
      {
        "tipo": "lacuna",
        "id": "cap-3-l16",
        "linhas": 5,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "O aporte a fundo perdido"
      },
      {
        "tipo": "lacuna",
        "id": "cap-3-l17",
        "linhas": 6,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A integralização de capital social"
      },
      {
        "tipo": "lacuna",
        "id": "cap-3-l18",
        "linhas": 1,
        "tamanho": "linha",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "Impõe-se aqui advertência terminológica determinante:"
      },
      {
        "tipo": "lacuna",
        "id": "cap-3-l19",
        "linhas": 7,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "O valor pelo qual os bens ingressam é regido pelo"
      },
      {
        "tipo": "lacuna",
        "id": "cap-3-l20",
        "linhas": 1,
        "tamanho": "linha",
        "sufixo": ","
      },
      {
        "tipo": "prosa",
        "texto": "que consolida a legislação do imposto sobre a renda sem inovar."
      },
      {
        "tipo": "citacao-legal",
        "id": "cap-3-l21",
        "rotulo": "Decreto",
        "linhas": 16,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A integralização de capital com bens imóveis é a modalidade"
      },
      {
        "tipo": "lacuna",
        "id": "cap-3-l22",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "Distingue-se aqui imunidade de isenção :"
      },
      {
        "tipo": "lacuna",
        "id": "cap-3-l23",
        "linhas": 5,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "citacao-legal",
        "id": "cap-3-l24",
        "rotulo": "CF, Art.",
        "linhas": 6,
        "tamanho": "paragrafo"
      },
      {
        "tipo": "prosa",
        "texto": "O dispositivo comporta duas hipóteses de não incidência, a"
      },
      {
        "tipo": "lacuna",
        "id": "cap-3-l25",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": ","
      },
      {
        "tipo": "prosa",
        "texto": "e observe-se que"
      },
      {
        "tipo": "lacuna",
        "id": "cap-3-l26",
        "linhas": 4,
        "tamanho": "paragrafo",
        "sufixo": "."
      }
    ]
  },
  {
    "id": "cap-4",
    "tipo": "capitulo",
    "numero": 4,
    "titulo": "Imunidade do ITBI",
    "ancora": true,
    "total_lacunas": 25,
    "blocos": [
      {
        "tipo": "prosa",
        "texto": "A norma do"
      },
      {
        "tipo": "lacuna",
        "id": "cap-4-l1",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": ","
      },
      {
        "tipo": "prosa",
        "texto": "e sua compreensão nesses termos fornece o argumento de que o profissional se vale perante a administração municipal. O Estado tem interesse em que as pessoas naturais"
      },
      {
        "tipo": "lacuna",
        "id": "cap-4-l2",
        "linhas": 4,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "Como a transferência não é gratuita, gerando contrapartida em participação societária,"
      },
      {
        "tipo": "lacuna",
        "id": "cap-4-l3",
        "linhas": 3,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "O alcance da imunidade foi delimitado pelo Tema 796 da repercussão geral do Supremo Tribunal Federal: a"
      },
      {
        "tipo": "lacuna",
        "id": "cap-4-l4",
        "linhas": 3,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "citacao-legal",
        "id": "cap-4-l5",
        "rotulo": "Lei",
        "linhas": 2,
        "tamanho": "paragrafo"
      },
      {
        "tipo": "prosa",
        "texto": "A objeção de que esse dispositivo integra a lei das sociedades anônimas não procede, porque a Lei 6.404/76 é o diploma que, no direito brasileiro, recebeu as regras gerais de contabilidade, aplicáveis para além do tipo societário que lhe empresta o nome, com respaldo no regime de convergência às normas internacionais introduzido pelas Leis 11.638/2007 e 11.941/2009."
      },
      {
        "tipo": "lacuna",
        "id": "cap-4-l6",
        "linhas": 3,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "citacao-legal",
        "id": "cap-4-l7",
        "rotulo": "STF, Tema",
        "linhas": 3,
        "tamanho": "paragrafo"
      },
      {
        "tipo": "prosa",
        "texto": "Diversas administrações municipais passaram, após o Tema 796, a exigir o ITBI"
      },
      {
        "tipo": "lacuna",
        "id": "cap-4-l8",
        "linhas": 7,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "citacao-legal",
        "id": "cap-4-l9",
        "rotulo": "CTN, Art.",
        "linhas": 2,
        "tamanho": "paragrafo"
      },
      {
        "tipo": "prosa",
        "texto": "Valor venal é o valor da operação onerosa efetivamente realizada, não se confundindo com"
      },
      {
        "tipo": "lacuna",
        "id": "cap-4-l10",
        "linhas": 4,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "citacao-legal",
        "id": "cap-4-l11",
        "rotulo": "CTN, Art.",
        "linhas": 7,
        "tamanho": "paragrafo"
      },
      {
        "tipo": "prosa",
        "texto": "O arbitramento subordina-se a duas hipóteses:"
      },
      {
        "tipo": "lacuna",
        "id": "cap-4-l12",
        "linhas": 5,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A norma municipal é inoponível por dois fundamentos. Primeiro,"
      },
      {
        "tipo": "lacuna",
        "id": "cap-4-l13",
        "linhas": 3,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "Segundo,"
      },
      {
        "tipo": "lacuna",
        "id": "cap-4-l14",
        "linhas": 3,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A jurisprudência confirma a análise: o"
      },
      {
        "tipo": "citacao-legal",
        "id": "cap-4-l15",
        "rotulo": "EREsp",
        "linhas": 4,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "citacao-legal",
        "id": "cap-4-l16",
        "rotulo": "STJ, AREsp",
        "linhas": 5,
        "tamanho": "paragrafo"
      },
      {
        "tipo": "prosa",
        "texto": "O estado da controvérsia é o seguinte: nos tribunais estaduais a orientação permanece controvertida, com predominância favorável ao contribuinte; no Supremo registram-se três julgados desfavoráveis, dois de relatoria do Ministro Luís Roberto Barroso sem enfrentamento de mérito e um, monocrático, do Ministro Flávio Dino, que enfrentou o mérito favoravelmente à pretensão municipal. Sustenta-se que o Supremo não formará orientação favorável às municipalidades, mas o profissional não pode ignorar que já há ministro em sentido contrário. Diante disso, três são as condutas possíveis. A primeira"
      },
      {
        "tipo": "lacuna",
        "id": "cap-4-l17",
        "linhas": 7,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A segunda conduta,"
      },
      {
        "tipo": "lacuna",
        "id": "cap-4-l18",
        "linhas": 3,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A terceira, adotada, é"
      },
      {
        "tipo": "lacuna",
        "id": "cap-4-l19",
        "linhas": 6,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "Resta a segunda questão em aberto, a dos imóveis destinados à locação. A ressalva constitucional exclui da imunidade a atividade imobiliária preponderante."
      },
      {
        "tipo": "citacao-legal",
        "id": "cap-4-l20",
        "rotulo": "CTN, Art.",
        "linhas": 9,
        "tamanho": "paragrafo"
      },
      {
        "tipo": "prosa",
        "texto": "Aplicado o § 2º à célula cofre recém-constituída, a apuração recai sobre"
      },
      {
        "tipo": "lacuna",
        "id": "cap-4-l21",
        "linhas": 3,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A conclusão é que"
      },
      {
        "tipo": "lacuna",
        "id": "cap-4-l22",
        "linhas": 3,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A solução assenta em premissa de direito civil, formulada por Sylvio Capanema de"
      },
      {
        "tipo": "lacuna",
        "id": "cap-4-l23",
        "linhas": 5,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "citacao-legal",
        "id": "cap-4-l24",
        "rotulo": "STJ, REsp",
        "linhas": 4,
        "tamanho": "paragrafo"
      },
      {
        "tipo": "prosa",
        "texto": "A"
      },
      {
        "tipo": "lacuna",
        "id": "cap-4-l25",
        "linhas": 1,
        "tamanho": "linha"
      },
      {
        "tipo": "prosa",
        "texto": "preserva a imunidade e reduz a carga tributária de patamar próximo a trinta e seis por cento, na pessoa natural, para patamar próximo a doze por cento, sendo os percentuais ordens de grandeza cuja definição pertence ao contador."
      }
    ]
  },
  {
    "id": "cap-5",
    "tipo": "capitulo",
    "numero": 5,
    "titulo": "Montagem da Holding Familiar — doação de quotas e cláusulas de proteção e preservação",
    "ancora": false,
    "total_lacunas": 14,
    "blocos": [
      {
        "tipo": "prosa",
        "texto": "Institucionalizado o patrimônio, os bens pertencem à célula cofre, e o que remanesce no patrimônio pessoal do cliente são as quotas, que integram o acervo hereditário. O deslocamento para a esfera institucional, isoladamente, não suprimiu o inventário: apenas alterou seu objeto, dos imóveis para as quotas. Duas vias se apresentam: eliminar a titularidade do cliente mediante transmissão antecipada das quotas, ou preservá-la afastando ainda assim a submissão a inventário. Este capítulo examina a primeira via, cujo instrumento é a doação de quotas com reserva de usufruto. A doação de quotas não se confunde com a doação de bens do direito civil, que é irrevogável; ela se sujeita a regras próprias do direito societário que asseguram ao doador o direito de arrependimento, inexistente na doação civil. A estrutura opera segundo um sistema de gatilho:"
      },
      {
        "tipo": "lacuna",
        "id": "cap-5-l1",
        "linhas": 4,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "Esse elemento é o"
      },
      {
        "tipo": "lacuna",
        "id": "cap-5-l2",
        "linhas": 4,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "Quatro cláusulas de direito civil integram a doação:"
      },
      {
        "tipo": "lacuna",
        "id": "cap-5-l3",
        "linhas": 6,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "citacao-legal",
        "id": "cap-5-l4",
        "rotulo": "CPC, Art.",
        "linhas": 2,
        "tamanho": "paragrafo"
      },
      {
        "tipo": "prosa",
        "texto": "O limite da impenhorabilidade impõe advertência: a cláusula não opera em face de"
      },
      {
        "tipo": "lacuna",
        "id": "cap-5-l5",
        "linhas": 7,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "citacao-legal",
        "id": "cap-5-l6",
        "rotulo": "CC, Art.",
        "linhas": 2,
        "tamanho": "paragrafo"
      },
      {
        "tipo": "prosa",
        "texto": "Ao lado das cláusulas civilistas, o sistema emprega instrumentos de direito societário, dos quais decorre a barreira de controle. (1)"
      },
      {
        "tipo": "lacuna",
        "id": "cap-5-l7",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "(2)"
      },
      {
        "tipo": "lacuna",
        "id": "cap-5-l8",
        "linhas": 5,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "(3)"
      },
      {
        "tipo": "lacuna",
        "id": "cap-5-l9",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "(4)"
      },
      {
        "tipo": "lacuna",
        "id": "cap-5-l10",
        "linhas": 3,
        "tamanho": "curto",
        "sufixo": ";"
      },
      {
        "tipo": "prosa",
        "texto": "(5)"
      },
      {
        "tipo": "lacuna",
        "id": "cap-5-l11",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "(6)"
      },
      {
        "tipo": "lacuna",
        "id": "cap-5-l12",
        "linhas": 4,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "(7)"
      },
      {
        "tipo": "lacuna",
        "id": "cap-5-l13",
        "linhas": 5,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "Conjugadas as cláusulas, a doação de quotas não transfere o domínio efetivo, mas a titularidade formal, conservando no doador a integralidade do poder sobre a sociedade e sobre os bens, sendo a posição dos donatários meramente figurativa."
      },
      {
        "tipo": "lacuna",
        "id": "cap-5-l14",
        "linhas": 4,
        "tamanho": "paragrafo",
        "sufixo": ":"
      },
      {
        "tipo": "prosa",
        "texto": "o roteiro básico é pressuposto necessário e insuficiente. Hipóteses como o custo elevado do ITCMD, a legislação estadual restritiva, os filhos havidos fora do casamento, os herdeiros menores, o regime da comunhão universal de bens, em que os cônjuges não podem ser sócios entre si, e os conflitos familiares exigem técnicas de nível avançado."
      }
    ]
  },
  {
    "id": "cap-6",
    "tipo": "capitulo",
    "numero": 6,
    "titulo": "Técnicas avançadas — domicílio fiscal e modelos de duas e três células",
    "ancora": true,
    "total_lacunas": 11,
    "blocos": [
      {
        "tipo": "prosa",
        "texto": "Denominam-se avançadas por contraposição ao roteiro elementar, e não por serem excepcionais; são técnicas mínimas, sem cujo domínio o exercício profissional não se sustenta. Todas reduzem licitamente o custo do ITCMD, ou afastam a necessidade de que a doação recaia sobre base economicamente inviável, apoiando-se em disciplina legal expressa, e não em artifício."
      },
      {
        "tipo": "subtitulo",
        "texto": "Domicílio Fiscal Mais Vantajoso"
      },
      {
        "tipo": "prosa",
        "texto": "A eleição de domicílio fiscal mais vantajoso repousa na distinção constitucional de competência no ITCMD conforme a natureza do bem transmitido."
      },
      {
        "tipo": "citacao-legal",
        "id": "cap-6-l1",
        "rotulo": "CF, Art.",
        "linhas": 5,
        "tamanho": "paragrafo"
      },
      {
        "tipo": "prosa",
        "texto": "A doação de quotas não é"
      },
      {
        "tipo": "lacuna",
        "id": "cap-6-l2",
        "linhas": 5,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "citacao-legal",
        "id": "cap-6-l3",
        "rotulo": "CTN, Art.",
        "linhas": 4,
        "tamanho": "paragrafo"
      },
      {
        "tipo": "prosa",
        "texto": "Os critérios legais são supletivos e operam apenas na falta de"
      },
      {
        "tipo": "lacuna",
        "id": "cap-6-l4",
        "linhas": 11,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "subtitulo",
        "texto": "Modelo De Duas Células"
      },
      {
        "tipo": "prosa",
        "texto": "O modelo de duas células destina-se à superação de legislação estadual que, para fins de base de cálculo do imposto sobre doação de quotas, imponha o valor venal atualizado dos imóveis quando o capital tenha sido integralizado com bens imóveis em prazo inferior a cinco anos, como no seguinte dispositivo."
      },
      {
        "tipo": "citacao-legal",
        "id": "cap-6-l5",
        "rotulo": "Lei estadua",
        "linhas": 5,
        "tamanho": "paragrafo"
      },
      {
        "tipo": "prosa",
        "texto": "A incidência desse preceito pressupõe que o capital da sociedade cujas quotas se doam tenha sido integralizado com bens imóveis; ausente esse elemento, o preceito não"
      },
      {
        "tipo": "lacuna",
        "id": "cap-6-l6",
        "linhas": 1,
        "tamanho": "linha",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A solução dissocia a célula"
      },
      {
        "tipo": "lacuna",
        "id": "cap-6-l7",
        "linhas": 5,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "subtitulo",
        "texto": "Modelo De Três Células"
      },
      {
        "tipo": "prosa",
        "texto": "O modelo de três células é aquele que, na experiência acumulada, noventa e nove de cada cem clientes elegem quando lhes são apresentadas as alternativas, e a decisão quanto ao modelo é do cliente, e não do profissional. A razão da preferência é dupla:"
      },
      {
        "tipo": "lacuna",
        "id": "cap-6-l8",
        "linhas": 10,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A arquitetura compõe-se de três células. A célula cofre"
      },
      {
        "tipo": "lacuna",
        "id": "cap-6-l9",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A célula veículo"
      },
      {
        "tipo": "lacuna",
        "id": "cap-6-l10",
        "linhas": 13,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "lacuna",
        "id": "cap-6-l11",
        "linhas": 11,
        "tamanho": "paragrafo",
        "sufixo": "."
      }
    ]
  },
  {
    "id": "extra-1",
    "tipo": "extra",
    "numero": 1,
    "titulo": "Operações unitárias e cronograma de execução",
    "ancora": true,
    "total_lacunas": 4,
    "blocos": [
      {
        "tipo": "prosa",
        "texto": "O principal obstáculo à atuação do profissional que se inicia não é a insuficiência de conhecimento, mas a pretensão de dominar o sistema integralmente antes de praticar o primeiro ato, o que produz confusão mental e paralisa. A designação operação unitária provém da engenharia industrial, onde denomina cada etapa elementar que, somada às demais, produz o resultado final, como a areia que se converte em vidro pela sucessão ordenada de operações. Sua transposição justifica-se porque a Holding Familiar não dispõe de diploma processual que ordene os atos, ausência que impõe a construção metodológica do roteiro, e não autoriza o improviso. A decomposição exige o domínio da etapa em curso, construindo-se a competência para a seguinte no percurso da anterior, de modo que o profissional que ainda não captou cliente não tem, quanto à execução, problema a resolver, sendo a captação a técnica que lhe importa. Não se executa uma Holding, executam-se processos seriados e seguros, cuja qualidade decorre da observância do roteiro, e não do talento individual, e cujos desafios, ao contrário do exercício forense, têm solução que não depende de terceiro. A supressão de etapas produz, tecnicamente, lacuna oponível pelo Fisco ou fundamento de invalidade, e, operacionalmente, embaraço na fase subsequente cuja origem dificilmente se identifica; a dispensa da sessão de viabilidade sob o argumento de proximidade com o cliente confunde conhecimento pessoal com diagnóstico técnico. Cada etapa decompõe-se em"
      },
      {
        "tipo": "lacuna",
        "id": "extra-1-l1",
        "linhas": 10,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "O cronograma é a resposta metodológica"
      },
      {
        "tipo": "lacuna",
        "id": "extra-1-l2",
        "linhas": 15,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "citacao-legal",
        "id": "extra-1-l3",
        "rotulo": "CC, Art.",
        "linhas": 2,
        "tamanho": "paragrafo"
      },
      {
        "tipo": "prosa",
        "texto": "Da distinção decorre que o requerimento de não incidência do ITBI"
      },
      {
        "tipo": "lacuna",
        "id": "extra-1-l4",
        "linhas": 6,
        "tamanho": "paragrafo",
        "sufixo": "."
      }
    ]
  },
  {
    "id": "extra-2",
    "tipo": "extra",
    "numero": 2,
    "titulo": "Holding rural",
    "ancora": true,
    "total_lacunas": 12,
    "blocos": [
      {
        "tipo": "prosa",
        "texto": "O patrimônio rural distingue-se do urbano em três planos: documental ,"
      },
      {
        "tipo": "lacuna",
        "id": "extra-2-l1",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": ";"
      },
      {
        "tipo": "prosa",
        "texto": "econômico ,"
      },
      {
        "tipo": "lacuna",
        "id": "extra-2-l2",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": ";"
      },
      {
        "tipo": "prosa",
        "texto": "e familiar ,"
      },
      {
        "tipo": "lacuna",
        "id": "extra-2-l3",
        "linhas": 7,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A consequência do inventário sobre o patrimônio rural excede a do urbano, porque"
      },
      {
        "tipo": "lacuna",
        "id": "extra-2-l4",
        "linhas": 12,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "O diagnóstico colhe os elementos relativos à pessoa natural e à família, incluídas as indagações sobre a dependência econômica dos descendentes e a identificação do administrador futuro, os elementos relativos à atividade, conforme pecuária ou lavoura, com apuração dos períodos de colheita que"
      },
      {
        "tipo": "lacuna",
        "id": "extra-2-l5",
        "linhas": 10,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "Os instrumentos de regularização repercutem sobre a execução. O Imposto sobre a Propriedade Territorial Rural é de competência da União (CF, art."
      },
      {
        "tipo": "lacuna",
        "id": "extra-2-l6",
        "linhas": 9,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "Lei 4.947/1966, Art."
      },
      {
        "tipo": "lacuna",
        "id": "extra-2-l7",
        "linhas": 3,
        "tamanho": "curto"
      },
      {
        "tipo": "prosa",
        "texto": "O georreferenciamento, disciplinado pela"
      },
      {
        "tipo": "citacao-legal",
        "id": "extra-2-l8",
        "rotulo": "Lei",
        "linhas": 1,
        "tamanho": "linha"
      },
      {
        "tipo": "prosa",
        "texto": "e pelos Decretos"
      },
      {
        "tipo": "lacuna",
        "id": "extra-2-l9",
        "linhas": 1,
        "tamanho": "linha"
      },
      {
        "tipo": "prosa",
        "texto": "/2002 e"
      },
      {
        "tipo": "lacuna",
        "id": "extra-2-l10",
        "linhas": 1,
        "tamanho": "linha"
      },
      {
        "tipo": "prosa",
        "texto": "/2005, é o instrumento central, pois o Superior Tribunal de Justiça fixou entendimento de que"
      },
      {
        "tipo": "lacuna",
        "id": "extra-2-l11",
        "linhas": 7,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "lacuna",
        "id": "extra-2-l12",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": "."
      }
    ]
  },
  {
    "id": "cap-7",
    "tipo": "capitulo",
    "numero": 7,
    "titulo": "Captação de clientes e fechamento de contratos",
    "ancora": true,
    "total_lacunas": 10,
    "blocos": [
      {
        "tipo": "prosa",
        "texto": "O domínio técnico, isoladamente, não gera trabalho. Interpõem-se entre o conhecimento e o exercício remunerado duas operações distintas: a captação, que conduz o cliente ao profissional, e a formação do contrato, que converte o interesse em contratação, cuja dificuldade decorre de os honorários da estruturação situarem-se em patamar elevado. As técnicas foram identificadas na prática dos escritórios norte-americanos e redesenhadas para o sistema de Holding Familiar, sem transposição mecânica e sem afirmação de eficácia em outras áreas. O universo de clientes potenciais compõe-se de três estratos de consciência. O primeiro reúne quem"
      },
      {
        "tipo": "lacuna",
        "id": "cap-7-l1",
        "linhas": 3,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "O segundo reúne quem"
      },
      {
        "tipo": "lacuna",
        "id": "cap-7-l2",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "O terceiro reúne quem"
      },
      {
        "tipo": "lacuna",
        "id": "cap-7-l3",
        "linhas": 5,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A consequência metodológica é que"
      },
      {
        "tipo": "lacuna",
        "id": "cap-7-l4",
        "linhas": 3,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A primeira técnica é"
      },
      {
        "tipo": "lacuna",
        "id": "cap-7-l5",
        "linhas": 5,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A técnica eleva três níveis sucessivos de consciência:"
      },
      {
        "tipo": "lacuna",
        "id": "cap-7-l6",
        "linhas": 6,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A segunda técnica é a dos"
      },
      {
        "tipo": "lacuna",
        "id": "cap-7-l7",
        "linhas": 18,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A terceira técnica é o"
      },
      {
        "tipo": "lacuna",
        "id": "cap-7-l8",
        "linhas": 11,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A técnica complementar dos"
      },
      {
        "tipo": "lacuna",
        "id": "cap-7-l9",
        "linhas": 1,
        "tamanho": "linha"
      },
      {
        "tipo": "prosa",
        "texto": "dirige-se ao profissional, e não ao cliente, constituindo a chave da transição da mentalidade de profissional liberal para a de empresário. Os honorários auferidos não pertencem ao profissional:"
      },
      {
        "tipo": "lacuna",
        "id": "cap-7-l10",
        "linhas": 12,
        "tamanho": "paragrafo",
        "sufixo": "."
      }
    ]
  },
  {
    "id": "extra-3",
    "tipo": "extra",
    "numero": 3,
    "titulo": "Ativos financeiros",
    "ancora": true,
    "total_lacunas": 10,
    "blocos": [
      {
        "tipo": "prosa",
        "texto": "A formação patrimonial brasileira, historicamente orientada ao bem imóvel, deslocou-se em medida expressiva para o mercado de investimentos, de modo que o profissional que domine exclusivamente a estruturação imobiliária deixa sem tratamento parcela crescente do acervo de seus clientes, tanto mais que o ativo financeiro submetido a inventário sofre desidratação superior à do bem imóvel. A premissa que orienta a abordagem é que, perdido o patrimônio, perde-se a renda que dele decorria, devendo o diagnóstico identificar a função que cada bem desempenha na vida da família, e não apenas seu valor. Distinguem-se o fundo fechado, que não admite resgate a qualquer tempo, facultada a alienação da quota, e o fundo aberto, que admite o resgate e concentra a maior parte dos recursos. Tratando-se de aplicação financeira"
      },
      {
        "tipo": "lacuna",
        "id": "extra-3-l1",
        "linhas": 17,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A solução principia por premissa cujo desconhecimento explica a dificuldade histórica: as aplicações financeiras não integram a base de cálculo da tributação das sociedades"
      },
      {
        "tipo": "lacuna",
        "id": "extra-3-l2",
        "linhas": 1,
        "tamanho": "linha",
        "sufixo": "."
      },
      {
        "tipo": "citacao-legal",
        "id": "extra-3-l3",
        "rotulo": "IN RFB",
        "linhas": 5,
        "tamanho": "paragrafo"
      },
      {
        "tipo": "citacao-legal",
        "id": "extra-3-l4",
        "rotulo": "LC",
        "linhas": 3,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "Sendo definitiva a tributação na fonte, e não integrando os rendimentos a base de cálculo do"
      },
      {
        "tipo": "lacuna",
        "id": "extra-3-l5",
        "linhas": 14,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A sociedade optante não pode investir em ações, porque o acionista é sócio e a participação em outra pessoa jurídica determina a"
      },
      {
        "tipo": "lacuna",
        "id": "extra-3-l6",
        "linhas": 8,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "citacao-legal",
        "id": "extra-3-l7",
        "rotulo": "CC, Art.",
        "linhas": 2,
        "tamanho": "paragrafo"
      },
      {
        "tipo": "citacao-legal",
        "id": "extra-3-l8",
        "rotulo": "CC, Art.",
        "linhas": 4,
        "tamanho": "paragrafo"
      },
      {
        "tipo": "prosa",
        "texto": "A arquitetura constitui a célula operacional de"
      },
      {
        "tipo": "lacuna",
        "id": "extra-3-l9",
        "linhas": 10,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "lacuna",
        "id": "extra-3-l10",
        "linhas": 6,
        "tamanho": "paragrafo",
        "sufixo": "."
      }
    ]
  },
  {
    "id": "extra-4",
    "tipo": "extra",
    "numero": 4,
    "titulo": "Contabilidade da holding e relação com o contador do cliente",
    "ancora": true,
    "total_lacunas": 10,
    "blocos": [
      {
        "tipo": "prosa",
        "texto": "A escrituração compete ao contador, e ao executor do sistema, ordinariamente sem formação contábil, basta compreensão suficiente para que a relação com o profissional da contabilidade não obste a execução. O problema prático é que a manifestação do contador do cliente suscita insegurança que compromete a contratação já encaminhada, e a exposição não se dirige contra o contador, pois a generalidade das objeções decorre de desconhecimento quanto ao que dele se espera. As objeções sob domínio do executor resolvem-se no plano do posicionamento profissional: a alegação de"
      },
      {
        "tipo": "lacuna",
        "id": "extra-4-l1",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": ";"
      },
      {
        "tipo": "prosa",
        "texto": "a alegação de"
      },
      {
        "tipo": "lacuna",
        "id": "extra-4-l2",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": ";"
      },
      {
        "tipo": "prosa",
        "texto": "e a sugestão de"
      },
      {
        "tipo": "lacuna",
        "id": "extra-4-l3",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "As objeções fora do domínio do executor, a demora na execução, a alegação de impossibilidade de contabilização e os honorários excessivos na manutenção, resolvem-se por via única, que é"
      },
      {
        "tipo": "lacuna",
        "id": "extra-4-l4",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "O primeiro objeto do trabalho contábil é"
      },
      {
        "tipo": "lacuna",
        "id": "extra-4-l5",
        "linhas": 10,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "O segundo objeto é o"
      },
      {
        "tipo": "lacuna",
        "id": "extra-4-l6",
        "linhas": 2,
        "tamanho": "curto",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "As obrigações acessórias"
      },
      {
        "tipo": "lacuna",
        "id": "extra-4-l7",
        "linhas": 4,
        "tamanho": "paragrafo",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "O registro das alterações compreende o"
      },
      {
        "tipo": "lacuna",
        "id": "extra-4-l8",
        "linhas": 7,
        "tamanho": "paragrafo",
        "sufixo": ";"
      },
      {
        "tipo": "lacuna",
        "id": "extra-4-l9",
        "linhas": 1,
        "tamanho": "linha",
        "sufixo": "."
      },
      {
        "tipo": "prosa",
        "texto": "A recusa do contador não constitui deficiência profissional, pela mesma razão que não se censura a especialização na medicina, e colocá-lo em desconforto produz precisamente a objeção que se pretendia evitar, sendo adequado reconhecer"
      },
      {
        "tipo": "lacuna",
        "id": "extra-4-l10",
        "linhas": 4,
        "tamanho": "paragrafo",
        "sufixo": "."
      }
    ]
  }
]

export default WORKBOOK
