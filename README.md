# Workbook CNHF

Ambiente do aluno + pesquisa de qualificação do **Curso Nacional de Formação em Holding Familiar**
(`workbook.cursoholding.com.br`).

## Tecnologias

- **Front-end:** Vue 3 + Vue Router (hash history) + Vite
- **Servidor:** Express (`server.js`) servindo o build estático
- **Dados/Auth:** **Supabase** (projeto principal do Grupo Participa, schema `workbook`),
  chamado direto do browser via `@supabase/supabase-js` (`src/data/api.js` + `src/data/supabase.js`).
  Auth nativo Supabase. Tabelas: `leads`, `perfis`, `respostas_pesquisa`, `progresso`, `anotacoes`.

> O front fala direto com o Supabase. O `server.js` serve o build como **Node app**
> (Hostinger Node.js, Render, Railway…). Se o alvo for hospedagem **estática** pura,
> basta subir `dist/` — o servidor não é obrigatório, mas as envs `VITE_*` precisam
> estar presentes **no momento do build** (o Vite as injeta no bundle).

## Configuração (Supabase)

Crie um `.env` na raiz (veja `.env.example`) — **não é versionado**:

```
VITE_SUPABASE_URL=https://mbvybujpkwuorhtdzcde.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key do projeto>
```

Como o Vite injeta as variáveis `VITE_*` no bundle em tempo de build, elas precisam
estar disponíveis quando `npm run build` roda (no CI/plataforma, configure-as como
variáveis de ambiente do build).

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

| Variável | Default   | Descrição                          |
| -------- | --------- | ---------------------------------- |
| `PORT`   | `3000`    | Porta HTTP do servidor             |
| `HOST`   | `0.0.0.0` | Host de bind                       |

### Healthcheck

`GET /health` → `{ "ok": true, "service": "workbook-cnhf" }`

## Deploy

O `dist/` **não** é versionado (ver `.gitignore`); rode `npm run build` no destino
(ou no CI) antes de `npm start`. Numa plataforma Node típica:

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
