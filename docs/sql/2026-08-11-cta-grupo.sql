-- ============================================================
-- workbook.status_grupo_por_email / workbook.status_grupo_por_telefone
-- ------------------------------------------------------------
-- Suporte ao CTA "entre no grupo de WhatsApp do seu segmento" na home do
-- aluno logado (Ambiente.vue). O requisito de produto é NÃO duplicar aluno
-- em grupo: mostrar o link só para quem ainda não está lá dentro.
--
-- Por que existem estas duas funções (e não uma leitura direta pelo front):
--   1. O casamento "já está no grupo?" depende de `controle.vw_lead_grupo_status`,
--      que é schema/dado de OUTRO sistema (controle de eventos/disparos), não do
--      workbook. O aluno autenticado no workbook não tem (e não deve ganhar)
--      leitura direta desse schema — a RLS de `controle` não é problema nosso
--      para gerir, e a política de menor privilégio é não expor a tabela.
--   2. O casamento é por TELEFONE (a view não tem e-mail), com normalização de
--      "últimos 8 dígitos" — regra específica desta base, não algo que faça
--      sentido reimplementar no client.
--   3. security definer + EXECUTE restrito a service_role: se `anon` ou
--      `authenticated` pudesse chamar isto com um e-mail arbitrário, viraria
--      oráculo de terceiro ("fulano@x.com já está no grupo de WhatsApp dele?"),
--      o mesmo formato de vazamento já documentado em
--      docs/audits/2026-07-27-rls-critico.md para `email_eh_lead`. Quem chama
--      é sempre o server.js com o e-mail extraído do token da própria sessão
--      (nunca do body) — ver GET /api/grupo e POST /api/grupo/telefone.
--
-- Suposição a confirmar antes de aplicar: a coluna de telefone em
-- `controle.vw_lead_grupo_status` foi assumida como `telefone` (padrão do
-- resto da base). Se o nome real for outro, ajustar antes de rodar — este
-- arquivo é para revisão, não é aplicado automaticamente.
-- ============================================================

-- ------------------------------------------------------------
-- workbook.status_grupo_por_email(p_email text)
--   → (area text, no_grupo boolean, tem_telefone boolean)
--
-- Resolve o segmento (área) pela resposta de pesquisa mais recente do
-- e-mail e se o telefone cadastrado já está no grupo do WhatsApp daquele
-- segmento. Sempre devolve exatamente 1 linha, mesmo sem nenhum match —
-- mesmo motivo do acesso_por_email: o chamador precisa distinguir
-- "não achou nada" de "erro de rede", e um SELECT que pode devolver zero
-- linhas não dá essa garantia.
-- ------------------------------------------------------------
create or replace function workbook.status_grupo_por_email(p_email text)
returns table (area text, no_grupo boolean, tem_telefone boolean)
language sql
security definer
stable
set search_path = workbook, controle, public, pg_temp
as $$
  with email_norm as (
    select lower(btrim(p_email)) as email
  ),
  -- respostas_pesquisa tem UNIQUE em user_id (upsert onConflict:'user_id' no
  -- app), então normalmente há no máximo 1 linha por e-mail; ainda assim,
  -- nunca confiar em "não pode ter duplicata" sem ORDER BY — se o e-mail
  -- mudou de user_id (recadastro) pode haver mais de uma linha histórica.
  -- Critério determinístico: a resposta mais recente por atualizado_em,
  -- com criado_em como desempate.
  pesquisa as (
    select rp.answers ->> 'area' as area
    from workbook.respostas_pesquisa rp, email_norm en
    where rp.email = en.email
    order by rp.atualizado_em desc nulls last, rp.criado_em desc
    limit 1
  ),
  -- telefone cadastrado do aluno (casado por e-mail, não por user_id: é o
  -- mesmo contrato usado na recuperação de acesso).
  lead as (
    select l.telefone
    from workbook.leads l, email_norm en
    where l.email = en.email
    limit 1
  ),
  -- normalização "últimos 8 dígitos": neutraliza DDI (+55), zero de tronco
  -- e o 9º dígito variável — validado nesta base (7.147/7.158 casaram).
  lead_norm as (
    select right(regexp_replace(coalesce(lead.telefone, ''), '\D', '', 'g'), 8) as tel8,
           length(regexp_replace(coalesce(lead.telefone, ''), '\D', '', 'g')) as qtd_digitos
    from lead
  ),
  grupo as (
    select true as achou
    from controle.vw_lead_grupo_status g, lead_norm ln
    where ln.qtd_digitos >= 10
      and g.permanece = true
      and right(regexp_replace(coalesce(g.telefone, ''), '\D', '', 'g'), 8) = ln.tel8
    limit 1
  )
  select
    pesquisa.area,
    coalesce(grupo.achou, false)                as no_grupo,
    coalesce(lead_norm.qtd_digitos, 0) >= 10     as tem_telefone
  from (select 1) uma_linha
  left join pesquisa on true
  left join lead_norm on true
  left join grupo on true
$$;

revoke execute on function workbook.status_grupo_por_email(text) from public, anon, authenticated;
grant  execute on function workbook.status_grupo_por_email(text) to service_role;

-- ------------------------------------------------------------
-- workbook.status_grupo_por_telefone(p_email text, p_telefone text)
--   → (area text, no_grupo boolean, tem_telefone boolean)
--
-- Caminho do aluno SEM telefone cadastrado (1.070 casos): ele informa o
-- WhatsApp na hora, na tela do CTA. A função checa `no_grupo` com o
-- telefone digitado e, SÓ QUANDO o resultado é "não está no grupo"
-- (v_no_grupo = false) E o cadastro está vazio/nulo, GRAVA esse telefone em
-- workbook.leads — nunca sobrescreve um telefone já existente (esta função
-- não é um endpoint de "trocar telefone").
--
-- Por que a gravação é condicionada a v_no_grupo = false (correção de
-- auditoria, 2026-08-11): o campo pode ser usado para SONDAR o número de um
-- terceiro (o aluno autenticado digita um número que não é o dele). Se o
-- número sondado já está no grupo, gravá-lo no cadastro do sondador
-- contamina a base de conciliação com um telefone que não é dele. O fluxo
-- legítimo é "não estou no grupo → entro com esse número"; nesse caso
-- v_no_grupo é false e a gravação é exatamente o comportamento desejado. Se
-- v_no_grupo é true, ou é o próprio aluno (que não precisa que gravemos
-- nada agora — ele já está lá) ou é sondagem — nos dois casos não gravar é
-- o correto.
--
-- `tem_telefone` no retorno reflete o telefone DIGITADO (sempre true se
-- passou pela validação de dígitos no server.js antes de chamar); existe
-- só para manter a mesma assinatura de status_grupo_por_email e permitir
-- que o server.js trate as duas respostas de forma uniforme.
-- ------------------------------------------------------------
create or replace function workbook.status_grupo_por_telefone(p_email text, p_telefone text)
returns table (area text, no_grupo boolean, tem_telefone boolean)
language plpgsql
security definer
volatile -- faz UPDATE condicional; não pode ser stable/immutable
set search_path = workbook, controle, public, pg_temp
as $$
declare
  v_email   text := lower(btrim(p_email));
  v_tel_dig text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
  v_tel8    text := right(v_tel_dig, 8);
  v_area    text;
  v_no_grupo boolean;
begin
  -- mesmo critério determinístico de status_grupo_por_email
  select rp.answers ->> 'area'
  into v_area
  from workbook.respostas_pesquisa rp
  where rp.email = v_email
  order by rp.atualizado_em desc nulls last, rp.criado_em desc
  limit 1;

  select exists (
    select 1
    from controle.vw_lead_grupo_status g
    where g.permanece = true
      and right(regexp_replace(coalesce(g.telefone, ''), '\D', '', 'g'), 8) = v_tel8
  )
  into v_no_grupo;

  -- grava o telefone digitado SÓ quando: (a) o resultado é "não está no
  -- grupo" — nunca ao sondar número de terceiro já-membro (ver comentário
  -- acima) — e (b) o campo está vazio/nulo — nunca sobrescreve um telefone
  -- já cadastrado (contrato explícito do produto).
  if coalesce(v_no_grupo, false) = false then
    update workbook.leads
    set telefone = p_telefone
    where email = v_email
      and (telefone is null or btrim(telefone) = '');
  end if;

  return query select v_area, coalesce(v_no_grupo, false), (length(v_tel_dig) >= 10);
end;
$$;

revoke execute on function workbook.status_grupo_por_telefone(text, text) from public, anon, authenticated;
grant  execute on function workbook.status_grupo_por_telefone(text, text) to service_role;
