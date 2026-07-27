# Workbook CNHF

Ambiente do aluno + pesquisa de qualificação do **Curso Nacional de Formação em Holding Familiar**
(`workbook.cursoholding.com.br`).

## Tecnologias

- **Front-end:** Vue 3 + Vue Router (hash history) + Vite
- **Servidor:** Express (`server.js`) servindo o build estático
- **Dados/Auth:** **Supabase** (projeto principal do Grupo Participa, schema `workbook`),
  chamado direto do browser via `@supabase/supabase-js` (`src/data/api.js` + `src/data/supabase.js`).
  Auth nativo Supabase. Tabelas: `leads`, `perfis`, `respostas_pesquisa`, `progresso`, `anotacoes`.

> O front fala direto com o Supabase para dados/auth. O `server.js` serve o build
> como **Node app** (Hostinger Node.js, Render, Railway…) **e expõe a API de
> recuperação de acesso** (`POST /api/recuperar-acesso`), que precisa da
> `service_role` — portanto o servidor Node **é obrigatório** em produção
> (hospedagem estática pura perderia a recuperação de acesso).

## Configuração (Supabase)

Crie um `.env` na raiz (veja `.env.example`) — **não é versionado**:

```
VITE_SUPABASE_URL=https://mbvybujpkwuorhtdzcde.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key do projeto>
```

Como o Vite injeta as variáveis `VITE_*` no bundle em tempo de build, elas precisam
estar disponíveis quando `npm run build` roda (no CI/plataforma, configure-as como
variáveis de ambiente do build).

### `SUPABASE_SERVICE_ROLE_KEY` (servidor apenas)

O `POST /api/recuperar-acesso` troca a senha de aluno deslogado e por isso o
`server.js` precisa da chave **service_role** do projeto:

- **Onde obter:** painel Supabase → *Settings → API* → `service_role` (secret).
- **Onde configurar:** variável de ambiente da Node app (Hostinger: painel da
  aplicação → variáveis de ambiente) ou no `.env` local. É lida **só** pelo
  `server.js` em runtime.
- **NUNCA no front.** Nada em `src/` pode importá-la, e ela não pode ganhar o
  prefixo `VITE_` (o Vite a injetaria no bundle). Atenção redobrada porque o
  `dist/` **é versionado** neste repositório: um vazamento pro bundle iria para
  o histórico do git e exigiria rotação imediata da chave. A service_role
  bypassa **toda** a RLS do projeto (que é multi-schema, compartilhado com o
  sistema-grupo-participa).
- **Sem a env:** o servidor sobe normalmente (o resto do app funciona), loga o
  aviso no boot e o endpoint responde `503 { code: "CONFIG" }` — falha
  explícita, nunca negação silenciosa.

### `POST /api/recuperar-acesso`

Recuperação de acesso sem e-mail: `{ email, telefone, senha }` → o servidor
confere e-mail + telefone contra o cadastro (`workbook.leads` e
`workbook.respostas_pesquisa`, com telefone normalizado — máscara, +55, DDD e
9º dígito são tolerados) e, conferindo, troca a senha via Admin API.

Propriedades: **resposta uniforme** (sucesso e falha devolvem 200 com o mesmo
corpo; o front descobre o resultado tentando logar) com **piso de tempo**
contra vazamento por timing; **rate limit** por IP (20/15min) e por e-mail
(5/15min) com bloqueio progressivo (dobra a cada estouro, até 24h) → `429` +
`Retry-After`; **auditoria** de toda tentativa em linhas `[auditoria]` no
stdout da Node app.

> **Limitação do rate limit:** o estado fica **em memória** — correto para o
> processo único da Hostinger. Com múltiplas instâncias cada uma teria contador
> próprio, e restart zera os contadores; nesse cenário, mover para Redis/tabela.

> **Dev:** o Vite (`npm run dev`, porta 5174) não proxeia `/api`. Para exercitar
> a recuperação em dev, use `npm run serve` (build + Express na 3000) ou adicione
> um proxy de `/api` → `http://localhost:3000` no `vite.config.js`.

## Requisitos

- Node.js >= 18

## Desenvolvimento

```bash
npm install
npm run dev        # Vite dev server em http://localhost:5174
```

## Produção (Node app)

```bash
npm install
npm run build      # gera dist/
npm start          # sobe o server.js (usa a env PORT, default 3000)
```

Atalho que faz build + sobe o servidor:

```bash
npm run serve
```

### Variáveis de ambiente

| Variável                    | Default            | Descrição                                            |
| --------------------------- | ------------------ | ---------------------------------------------------- |
| `PORT`                      | `3000`             | Porta HTTP do servidor                               |
| `HOST`                      | `0.0.0.0`          | Host de bind                                         |
| `SUPABASE_SERVICE_ROLE_KEY` | — (obrigatória p/ recuperação) | service_role do projeto (ver seção acima) |
| `SUPABASE_URL`              | `VITE_SUPABASE_URL`| URL do projeto para o server (raro precisar mudar)   |
| `RL_MAX_EMAIL` / `RL_MAX_IP` / `RL_JANELA_MS` | `5` / `20` / `900000` | Ajuste fino do rate limit (testes/tuning) |

### Healthcheck

`GET /health` → `{ "ok": true, "service": "workbook-cnhf" }`

## Deploy

O `dist/` **é** versionado de propósito (ver o comentário no `.gitignore`): a Hostinger
Node app às vezes reinicia o processo sem o build no lugar e passa a exibir
"preparando…". Com o `dist/` no repo, ele sempre existe em runtime. **Rebuilde e
committe o `dist/` junto a cada mudança de código.** Numa plataforma Node típica:

- **Build command:** `npm install && npm run build`
- **Start command:** `npm start`

## Estrutura

```
server.js              # servidor Express de produção
vite.config.js         # base './' p/ caminhos relativos
index.html             # entrada do Vite
src/
  main.js              # bootstrap Vue
  router.js            # rotas (hash history) + guarda de auth/pesquisa
  App.vue
  styles.css
  components/          # LogoCNHF, PieChart
  data/
    supabase.js        # client supabase-js (schema workbook)
    api.js             # camada de dados/auth sobre o Supabase
    survey-schema.js   # schema da pesquisa
  views/               # Login, CriarAcesso, EsqueciSenha, RedefinirSenha,
                       # Pesquisa, Ambiente, Anotacoes, Resultados
public/                # favicon
```
