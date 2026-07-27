# Auditoria de segurança — Workbook CNHF (26/07/2026)

Contexto: auditoria disparada após a refatoração do workbook para livro editorial
+ persistência local-first + PWA. Escopo prioritário: `store.js`, `api.js`,
`sw.js`, `book-render.js`, `manifest`/`index.html`.

Resultado original: **1 crítico, 3 altos, 5 médios, 4 baixos.**

---

## Corrigido e verificado

| Sev | Finding | Correção | Prova |
|---|---|---|---|
| CRÍTICO | Store singleton não resetava na troca de conta: aluno B via e **gravava** as respostas do aluno A na própria linha, destruindo as dele pelo merge por timestamp | `reset()` no store; guarda de `init()` por identidade de uid; trava de uid independente em `executarSync` e no beacon; `logout()` reseta e purga | `tmp/squad/poc-switch.mjs` — B agora vê e grava só os próprios dados |
| ALTO | SW servia leitura de cache quando a rede falhava, anulando a invariante "se a leitura falhar, não grava" → apagava campos do banco exibindo "salvo" | SW não intercepta mais **nada** do Supabase (`sw.js`); `cache: 'no-store'` no fetch global do client | `sw.js` sem `rest/v1`; PoC de origem eliminada |
| ALTO | Logout não purgava nada: respostas em IndexedDB e **base inteira de leads** (quando admin abre `/resultado-das-pesquisas`) ficavam em claro no disco, sem expiração | `purgarDadosLocais()` apaga IndexedDB + caches `wbcnhf*`; `CACHE_API` removido de `CACHES_ATUAIS` para apagar o cache de PII já em campo; handler `message` de purga no SW | — |
| MÉDIO | JWT gravado em disco: `cache.put(req,…)` guarda o Request inteiro, headers inclusive | `chaveSemCredenciais()` reconstrói a chave só a partir da URL, nos 3 caminhos de cache | — |
| MÉDIO | Sem headers de segurança no `server.js` | CSP, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy` (`microphone=(self)` p/ o ditado), `frame-ancestors 'none'`; `no-cache` no `sw.js` | resposta HTTP conferida |
| MÉDIO | `logout()` fire-and-forget: guarda de rota corria com o `signOut` e devolvia o aluno pro ambiente | `setSession(null)` antes do await; `await logout()` + `location.replace` no `sair()` | — |
| BAIXO | Beacon acoplado a propriedades `protected` do supabase-js; sem checar expiração do token | `SUPABASE_URL`/`SUPABASE_ANON` exportados de `supabase.js`; aborta se o token expira em <60s | — |
| BAIXO | Escape do gerador de livro: `'` não escapado, escape "à distância" no subtítulo da capa, `escCss` sem quebra de linha | Corrigidos + regra documentada no topo do arquivo | `scripts/test-book-render.mjs` |
| BAIXO | SW: `endsWith('.supabase.co')`, `includes('/assets/')`, cache de resposta redirecionada | Host/escopo exatos, `startsWith`, `cacheavel()` rejeita `redirected` | — |
| INFO | `t` no futuro pinava um campo para sempre (merge é `>` estrito) | Clamp de `Date.now() + 5min` em `normalizarCampo` | — |

Bug colateral encontrado ao revisar a própria correção: o nome do aluno era
escapado duas vezes (`renderizarLivro` + `renderCapa`), então "D'Ávila" sairia
impresso como `D&#39;Ávila` na capa. Corrigido — escape só no ponto de interpolação.

---

## PENDENTE — exige acesso ao banco (ação do João)

O front fala direto com o Supabase; **a RLS é a única defesa real**. A guarda
`meta.admin` do router é cosmética, e `saveWorkbookBeacon` documenta no próprio
repo como falar com o PostgREST usando o token do aluno. Enquanto o SQL abaixo
não for rodado, a premissa "a anon key é segura porque a RLS protege" está
**formalmente não validada**.

Ordem de urgência — o item (b) é o mais grave: se um aluno puder dar `UPDATE` em
`perfis.role`, ele vira admin e lê a base de leads inteira.

```sql
-- (a) RLS ligada em todas as tabelas do schema?
select c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'workbook' and c.relkind = 'r' order by 1;

-- (b) MAIS URGENTE: aluno consegue escalar para admin via perfis.role?
select policyname, cmd, qual, with_check from pg_policies
where schemaname='workbook' and tablename='perfis';
select column_name, privilege_type from information_schema.column_privileges
where table_schema='workbook' and table_name='perfis' and grantee='authenticated';

-- (c) Policies de INSERT/UPDATE/ALL sem WITH CHECK permitem escrever
--     na linha de outro user_id (é o que o beacon exploraria)
select tablename, policyname, cmd from pg_policies
where schemaname='workbook' and cmd in ('INSERT','UPDATE','ALL') and with_check is null;

-- (d) GRANTs diretos a anon/authenticated
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema='workbook' and grantee in ('anon','authenticated') order by 1,2;

-- (e) RPCs security definer expostas a anon
select p.proname, p.prosecdef, pg_get_function_identity_arguments(p.oid) args
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('workbook','public')
  and p.proname in ('email_eh_lead','resposta_duplicada');
```

Confirmar também: `workbook_respostas` precisa de `with check (user_id = auth.uid())`
em INSERT **e** UPDATE; `respostas_pesquisa` com SELECT restrito ao dono ou a admin.

---

## PENDENTE — decisão de produto (não agi sozinho)

- **Enumeração de contas (MÉDIO).** A RPC `email_eh_lead` é chamável com a anon
  key, sem auth e sem rate limit — dá para testar uma lista de e-mails e
  descobrir quem é aluno do CNHF, insumo para phishing dirigido. A UI amplifica:
  o login distingue "não cadastrado" de "senha incorreta", e o "esqueci a senha"
  responde antes de enviar o e-mail. Corrigir muda a UX de propósito (mensagem
  única "e-mail ou senha incorretos"), então fica para o João decidir. Ação
  independente e recomendada: `revoke execute on email_eh_lead from anon` e
  ativar Attack Protection no painel Supabase (hoje não há trava de tentativas).
- **`/redefinir-senha` sem re-autenticação (MÉDIO).** `resetPassword` ignora o
  token e troca a senha de **qualquer sessão ativa**. Numa sessão esquecida em
  dispositivo compartilhado, um terceiro converte acesso momentâneo em tomada
  permanente da conta. A correção exige distinguir sessão de recovery (checar
  `amr` no JWT ou o evento `PASSWORD_RECOVERY`) e mexe no fluxo de senha.
- **Mass assignment na pesquisa (BAIXO).** `health_score`, `health_flags` e
  `duplicado` são calculados no browser e enviados no upsert — um lead pode
  forjar a própria pontuação e envenenar a priorização comercial. Correção certa
  é trigger no Postgres.

## Follow-up técnico recomendado

- **RPC transacional de merge no Postgres.** Substituir o read-merge-write no
  client por `workbook.merge_respostas(jsonb)` mata de uma vez a janela de
  corrida, o beacon sem read-merge e a dependência de relógio do cliente. É a
  correção definitiva da classe inteira de bugs de persistência.
- **Rotação da anon key** hoje exige rebuild + commit (chave com fallback
  hardcoded + `dist/` versionado). Deixar `VITE_SUPABASE_ANON_KEY` funcionando
  no build de produção para a rotação não depender de mexer em código.
- **Escopo além deste app:** o projeto Supabase `mbvybujpkwuorhtdzcde` é
  compartilhado com o `sistema-grupo-participa` (multi-schema). Uma policy
  frouxa ou uma RPC `security definer` sem `search_path` fixo pode ter alcance
  além do workbook. Merece auditoria própria.

## Auditado e aprovado (sem finding)

`npm audit` limpo (163 deps); nenhuma `service_role` no repo, no `dist/`
versionado ou no histórico do git; nenhum `v-html`/`innerHTML`/`eval` em `src/`;
nenhum `console.*` vazando token ou PII; `gerarSenha` usa `crypto.getRandomValues`
(~58 bits); o caminho do beacon não vaza token (header, nunca URL); respostas
opacas não são cacheadas pelo SW; a guarda de rota admin falha fechada offline.
Confirmado que **não** havia caminho do SW servindo workbook de um aluno a outro
— chaves de cache incluem `user_id` na query string; o vazamento cross-aluno era
pelo store singleton.
