# CLAUDE.md — Workbook CNHF

Ambiente do aluno do **Curso Nacional de Formação em Holding Familiar**
(`workbook.cursoholding.com.br`). Curso pago, público de advogados e contadores.

Documento vivo: atualizar sempre que descobrir um hurdle novo ou tomar decisão
arquitetural. Leia antes de mexer.

---

## O fluxo do produto (entender antes de codar)

1. **Pesquisa pública** (`/pesquisa`) — porta de entrada do funil. O lead responde
   sem login.
2. Ao terminar, o sistema **cria o acesso com senha gerada** e mostra numa tela de
   credenciais. Confirmação de e-mail está **desligada** no projeto Supabase, então
   o `signUp` já devolve sessão.
3. **Central do aluno** (`/`) — home: retomada, progresso por capítulo, anotações.
4. **Workbook** (`/workbook`) — o caderno. O aluno preenche **149 lacunas ao vivo,
   durante a aula**, enquanto o professor dita.
5. **Recuperação** (`/recuperar-acesso`) — e-mail + WhatsApp do cadastro + senha nova.

O ponto crítico do produto é o **item 4**: se a persistência falhar durante uma aula
ao vivo, o aluno perde a aula e não tem como recuperar. Confiabilidade ali não é
otimização, é o produto.

---

## Invariantes duras

1. **`dist/` É versionado de propósito.** A Hostinger às vezes reinicia o processo
   sem o build no lugar. Rebuildar e commitar o `dist/` a cada mudança de código.
2. **`service_role` só no `server.js`, via env.** Nunca com prefixo `VITE_` (o Vite
   injeta no bundle), nunca importada por nada em `src/`. Como o `dist/` é
   versionado, um vazamento vai parar no git e obriga rotação.
3. **A RLS do Supabase é a ÚNICA defesa real.** O front fala direto com o PostgREST;
   a guarda `meta.admin` do router protege o clique, não o dado. Qualquer tabela
   nova precisa de policy antes de existir dado real nela.
4. **O texto de prosa do workbook é conteúdo jurídico.** Não alterar uma palavra de
   `workbook-content.js`. Mudanças estruturais vão pelo `scripts/migrate-content-v2.mjs`,
   que é a fonte de verdade; o output é gerado, não editado à mão.
5. **Os 149 ids de lacuna são chave primária das respostas de alunos reais.** Nenhum
   pode sumir, mudar ou ser criado sem migração.
6. **Sem CDN e sem dependência nova sem justificar** — o app é PWA e roda offline.
7. `npm run build` tem que passar limpo.

---

## Arquitetura

```
server.js              Express: serve dist/ + POST /api/recuperar-acesso
src/data/
  supabase.js          client (schema `workbook`); cache:'no-store' em tudo
  api.js               camada de dados/auth sobre o Supabase
  store.js             persistência local-first do workbook (CONTRATO abaixo)
  workbook-content.js  GERADO — 11 seções, 149 lacunas, schema v2
  book-render.js       fonte ÚNICA do livro impresso (browser-print + build Node)
  survey-schema.js     perguntas da pesquisa
src/components/livro/  componentes do leitor (lacunas, mapa, painel)
src/components/ui/     componentes da central (modal, status, sumário vivo)
scripts/
  migrate-content-v2.mjs  regenera workbook-content.js
  build-book.mjs          apostila em PDF via Chrome headless
```

### Contrato do store (`src/data/store.js`)
Local-first: IndexedDB a cada tecla, sync remoto debounced com **merge por campo**
(`{v, t}`, maior timestamp vence). Nunca substituir o mapa inteiro — foi o bug que
fazia duas abas abertas apagarem respostas.

```js
await store.init()   // idempotente; RESETA se o uid mudou (troca de conta)
store.valores        // reactive; v-model direto persiste
store.status         // 'salvo'|'salvando'|'offline'|'erro'  + store.pendentes
await store.flush()
```

`store.reset()` é obrigatório no logout: o singleton de módulo sobrevive à
navegação SPA, e sem reset o aluno seguinte via e sobrescrevia as respostas do
anterior.

### Schema do conteúdo (v2)
`WORKBOOK[].paragrafos[]` com três formas: `{tipo:'paragrafo', blocos:[prosa|lacuna]}`,
`{tipo:'subtitulo'}`, `{tipo:'citacao-legal'}`. Campos `romano` (numeral do capítulo)
e `largura` (`xs|sm|md|lg|xl` → 6/10/18/28/40ch) nas lacunas inline.

---

## Common Hurdles (aprendidos na marra)

### 1. `app.listen()` condicionado a heurística derruba a produção
A Hostinger **não** roda `node server.js` direto — carrega o app por um wrapper.
Comparar `import.meta.url` com `process.argv[1]` para decidir se sobe o listener
fez o servidor nunca abrir a porta: 503 em tudo, inclusive `/health`.
**Regra: escutar é o padrão; teste opta por sair (`WORKBOOK_NO_LISTEN=1`).**

### 2. `/health` é o primeiro diagnóstico
Responde sempre, independente do `dist/` e das envs. Se ele der 503, **o app não
está no ar** — não perca tempo investigando configuração. Ele expõe `distOk` e
`srvKey` (booleano) justamente para isso.

### 3. Service worker não pode cachear leitura que alimenta read-modify-write
O SW servia `getWorkbook()` do cache quando a rede falhava; o merge acontecia sobre
snapshot velho e **apagava campos do banco exibindo "salvo"**. Hoje o SW **não
intercepta o Supabase**. A leitura offline vem do IndexedDB.

### 4. Cache do SW guarda o Request inteiro — headers inclusive
`cache.put(req, …)` gravava o `Authorization: Bearer <JWT>` em disco. Sempre
reconstruir a chave só com a URL.

### 5. Telefone brasileiro precisa de normalização
O aluno digita de um jeito no cadastro e de outro na recuperação. Comparar só
dígitos, tolerando `+55` (sem engolir o DDD 55), zero de tronco e 9º dígito.
Comparação literal = ninguém recupera a conta.

### 6. Grant a `PUBLIC` não é revogado tirando de `anon`
`revoke ... from anon` não tem efeito se o `EXECUTE` foi concedido a `PUBLIC`.
Conferir o ACL (`proacl`) antes de dar como fechado.

### 7. Endpoint de recuperação precisa de resposta uniforme
Sucesso, e-mail inexistente, telefone errado **e erro interno pós-validação**
devolvem o mesmo 200 com o mesmo corpo. Um 500 só no caminho do update revelaria
que o par conferiu. Há piso de tempo + jitter contra oráculo de timing.

### 8. PowerShell + `git commit -m` com here-string quebra
Usar `git commit -F <arquivo>` para mensagens multi-linha.

---

## Verificação

```bash
npm run build                      # tem que passar limpo
node scripts/test-book-render.mjs  # escape do gerador de livro (XSS)
node scripts/build-book.mjs        # apostila em PDF (41 páginas)
```

Telas: há Playwright no projeto; harnesses de referência em `tmp/squad/shots*/`
resolvem sessão Supabase falsa e interceptação de rede. **Screenshot só vale se
alguém olhar** — foi olhando que apareceram a pontuação órfã, o capítulo virando
formulário e a linha cortada no mobile.

---

## Pendências conhecidas

- **Enumeração de contas.** `email_eh_lead` é executável por `PUBLIC` (sem login):
  dá para testar uma lista de e-mails e descobrir quem é aluno — insumo de phishing.
  Fechar exige `revoke execute ... from public`, **e isso quebra a mensagem
  "não cadastrado" do login** — que é útil para o aluno. Decisão de UX pendente:
  `MENSAGEM_UNICA_LOGIN` em `Login.vue:16` está `false` (mensagem detalhada).
  Severidade baixa; os dois lados são defensáveis.
- **`sip` tem 3 tabelas `_bkp_*` sem RLS num schema EXPOSTO na API.** Legíveis por
  qualquer um com a anon key. São do `sistema-grupo-participa` — verificar se ainda
  servem antes de dropar ou ligar RLS.
- **RPC transacional de merge** no Postgres substituiria o read-merge-write do
  client e mataria de vez a janela de corrida, o beacon sem read-merge e a
  dependência do relógio do cliente.
- `requestReset`/`resetPassword` em `api.js` são legado do fluxo por e-mail
  (as telas foram removidas, as rotas redirecionam). Mantidos por carregarem a
  trava de sessão de recovery; remover exige limpar os helpers associados.
- Auditorias em `docs/audits/`. A de 27/07 tem o SQL de RLS já aplicado.
