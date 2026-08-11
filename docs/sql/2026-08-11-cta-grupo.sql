-- ============================================================
-- workbook.status_grupo_por_email
-- ------------------------------------------------------------
-- Suporte ao CTA "entre no grupo de WhatsApp do seu segmento" na home do
-- aluno logado (Ambiente.vue). O requisito de produto é NÃO duplicar aluno
-- em grupo: mostrar o link só para quem ainda não está lá dentro.
--
-- Por que esta função existe (e não uma leitura direta pelo front):
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
--      (nunca do body) — ver GET /api/grupo.
--
-- Estado: APLICADO em producao (v2, com fallback da pesquisa). A funcao
-- irma `status_grupo_por_telefone` foi DROPADA em 11/08/2026 junto com a
-- rota POST /api/grupo/telefone: o CTA deixou de pedir o numero ao aluno,
-- e sem consumidor ela so seria superficie de ataque (permitia consultar
-- se um telefone arbitrario esta no grupo).
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
    select rp.answers ->> 'area' as area,
           rp.telefone            as telefone
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
  -- v2 (11/08/2026): o telefone tambem vem da PESQUISA. Medido: dos 1.090
  -- alunos sem telefone em workbook.leads, 1.011 tem em respostas_pesquisa.
  -- Ler as duas fontes derrubou o caso "sem telefone" de 1.090 para 79.
  -- leads tem prioridade; a pesquisa e o fallback.
  tel as (
    select coalesce(
             nullif(regexp_replace(coalesce((select telefone from lead), ''), '\D', '', 'g'), ''),
             nullif(regexp_replace(coalesce((select telefone from pesquisa), ''), '\D', '', 'g'), '')
           ) as digitos
  ),
  -- normalização "últimos 8 dígitos": neutraliza DDI (+55), zero de tronco
  -- e o 9º dígito variável — validado nesta base (7.147/7.158 casaram).
  tel_norm as (
    select right(coalesce(digitos,''), 8) as tel8,
           length(coalesce(digitos,''))   as qtd_digitos
    from tel
  ),
  grupo as (
    select true as achou
    from controle.vw_lead_grupo_status g, tel_norm tn
    where tn.qtd_digitos >= 10
      and g.permanece = true
      and right(regexp_replace(coalesce(g.telefone, ''), '\D', '', 'g'), 8) = tn.tel8
    limit 1
  )
  select
    pesquisa.area,
    coalesce(grupo.achou, false)                as no_grupo,
    coalesce(tel_norm.qtd_digitos, 0) >= 10      as tem_telefone
  from (select 1) uma_linha
  left join pesquisa on true
  left join tel_norm on true
  left join grupo on true
$$;

revoke execute on function workbook.status_grupo_por_email(text) from public, anon, authenticated;
grant  execute on function workbook.status_grupo_por_email(text) to service_role;
