-- ============================================================
-- workbook.acesso_por_email — suporte ao LOGIN CRU (só e-mail)
-- ------------------------------------------------------------
-- Decisão de produto (2026-08-11, reafirmada): o aluno entra digitando
-- SÓ o e-mail. Sem senha, sem WhatsApp, sem dados de pesquisa — quem
-- prova posse do e-mail é o magic link, não este endpoint.
--
-- Esta função existe para o /api/entrar decidir, com UMA consulta, se o
-- e-mail existe e se é de admin — sem devolver nenhum outro dado (nem
-- user_id, nem nome). Devolver mais do que o booleano necessário viraria
-- vazamento: quem chama isto é o service_role a partir do server.js, mas
-- a função em si é o único ponto que toca auth.users nesse fluxo.
--
-- security definer é obrigatório porque authenticated/anon não têm (e não
-- devem ganhar) leitura direta de auth.users. O EXECUTE fica reservado ao
-- service_role: se `anon` pudesse chamar, a função viraria um oráculo
-- "este e-mail é admin?" — pior que a enumeração já aceita de propósito
-- para "existe", porque aqui o alvo é justamente quem tem acesso a
-- /resultado-das-pesquisas (toda a base de respostas).
-- ============================================================

create or replace function workbook.acesso_por_email(p_email text)
returns table (existe boolean, eh_admin boolean)
language sql
security definer
stable
set search_path = workbook, auth, pg_temp
as $$
  -- CTE materializa o match (0 ou 1 linha); o SELECT externo sempre devolve
  -- exatamente 1 linha, com existe=false quando não achou ninguém — se o
  -- WHERE estivesse direto no SELECT principal, e-mail inexistente devolveria
  -- ZERO linhas em vez de {existe:false}, e o RPC no server.js não tem como
  -- distinguir "não achou" de "erro de rede" nesse formato.
  with achado as (
    select u.id, (p.role = 'admin') as admin
    from auth.users u
    left join workbook.perfis p on p.user_id = u.id
    -- lower/btrim no PARÂMETRO, nunca na coluna: aplicar função na coluna
    -- mata o uso do índice de auth.users.email (varredura sequencial).
    where u.email = lower(btrim(p_email))
    limit 1
  )
  select
    (achado.id is not null)        as existe,
    coalesce(achado.admin, false)  as eh_admin
  from (select 1) uma_linha
  left join achado on true
$$;

revoke execute on function workbook.acesso_por_email(text) from public, anon, authenticated;
grant  execute on function workbook.acesso_por_email(text) to service_role;
