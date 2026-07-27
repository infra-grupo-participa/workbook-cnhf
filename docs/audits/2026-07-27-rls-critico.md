# CRÍTICO — RLS do schema `workbook` está aberta (27/07/2026)

Confirmado **empiricamente** contra o banco de produção, com uma sessão de aluno
comum criada e destruída no teste. Não é análise estática: as requisições abaixo
foram executadas e retornaram sucesso.

## O que um aluno logado consegue fazer hoje

| # | Ação | Resultado | Impacto |
|---|---|---|---|
| 1 | `PATCH /rest/v1/perfis?user_id=eq.<próprio>` com `{"role":"admin"}` | **200 — virou admin** | Escalação vertical. Vira admin do painel, vê tudo. |
| 2 | `GET /rest/v1/respostas_pesquisa?select=*` | **200 — 100 linhas de terceiros** | Base inteira de leads: nome, e-mail, telefone, todas as respostas. |
| 3 | `GET /rest/v1/leads?select=*` | **200 — 100 linhas de terceiros** | Idem. |
| 4 | `GET /rest/v1/perfis?select=*` | **200 — 100 linhas de terceiros** | Idem. |
| 5 | `POST /rest/v1/rpc/email_eh_lead` **sem login** | **200** | Enumeração: testar lista de e-mails e descobrir quem é aluno. |

Bloqueado corretamente (não mexer): escrita em `workbook_respostas` de outro
`user_id` → 403. Criação de `anotacoes` também respondeu 403.

**Reprodução:** basta uma conta de aluno (qualquer pessoa consegue uma respondendo
a pesquisa pública) e a anon key, que é pública por design e está no bundle.

**Por que isso vaza tudo:** o front fala direto com o PostgREST. Não existe
camada de aplicação entre o aluno e o banco. A guarda `meta.admin` do router é
cosmética — protege o clique, não o dado. **A RLS é a única defesa que existe.**

## Correção — rodar no SQL Editor do Supabase

> Revise os nomes das policies existentes antes (Dashboard → Authentication →
> Policies, schema `workbook`). O `drop policy if exists` abaixo cobre os nomes
> mais prováveis; se as suas tiverem outro nome, ajuste.

```sql
-- ============================================================
-- 1. ESCALAÇÃO DE PRIVILÉGIO (o mais urgente)
-- Trava de coluna: nem policy nenhuma salva se o GRANT permite.
-- ============================================================
revoke update on workbook.perfis from authenticated;
grant  update (nome) on workbook.perfis to authenticated;   -- só o que o aluno pode editar

-- 2. LEITURA DA BASE DE LEADS
-- Função de apoio (evita recursão de policy ao checar admin)
create or replace function workbook.eh_admin()
returns boolean language sql security definer stable
set search_path = workbook, public as $$
  select exists (select 1 from workbook.perfis
                 where user_id = auth.uid() and role = 'admin');
$$;
revoke execute on function workbook.eh_admin() from anon;

alter table workbook.perfis             enable row level security;
alter table workbook.leads              enable row level security;
alter table workbook.respostas_pesquisa enable row level security;

drop policy if exists "autenticados podem ler" on workbook.perfis;
drop policy if exists "leitura"                on workbook.perfis;
create policy "perfil: dono ou admin" on workbook.perfis
  for select to authenticated
  using (user_id = auth.uid() or workbook.eh_admin());
create policy "perfil: dono atualiza" on workbook.perfis
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "autenticados podem ler" on workbook.leads;
drop policy if exists "leitura"                on workbook.leads;
create policy "lead: dono ou admin" on workbook.leads
  for select to authenticated
  using (email = auth.jwt() ->> 'email' or workbook.eh_admin());

drop policy if exists "autenticados podem ler" on workbook.respostas_pesquisa;
drop policy if exists "leitura"                on workbook.respostas_pesquisa;
create policy "pesquisa: dono ou admin" on workbook.respostas_pesquisa
  for select to authenticated
  using (user_id = auth.uid() or workbook.eh_admin());
create policy "pesquisa: dono grava" on workbook.respostas_pesquisa
  for insert to authenticated with check (user_id = auth.uid());
create policy "pesquisa: dono atualiza" on workbook.respostas_pesquisa
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3. ENUMERAÇÃO
revoke execute on function workbook.email_eh_lead(text) from anon;
```

## Depois de rodar — reteste

O script de verificação usado nesta apuração está no scratchpad da sessão. O
essencial: com uma sessão de aluno comum, `PATCH perfis.role='admin'` tem que
falhar, e `GET leads` / `GET respostas_pesquisa` têm que devolver **só a linha
do próprio aluno**.

## Atenção: alcance além deste app

O projeto Supabase `mbvybujpkwuorhtdzcde` é **compartilhado com o
`sistema-grupo-participa`** (multi-schema). Esta apuração cobriu só o schema
`workbook`. Os outros schemas do mesmo projeto precisam da mesma verificação —
se a RLS de `workbook` estava assim, é provável que os vizinhos estejam também.

## Rotação de credencial

A `service_role` key foi transmitida por chat durante esta sessão. Rotacionar no
Dashboard (Settings → API → Reset) e atualizar a env da Hostinger. A anon key
não precisa ser rotacionada por isso (é pública por design), mas **só é segura
depois que a RLS acima estiver correta** — hoje ela não é.
