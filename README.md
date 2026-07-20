# Workbook CNHF

Ambiente do aluno + pesquisa de qualificação do **Curso Nacional de Formação em Holding Familiar**
(`workbook.cursoholding.com.br`).

## Tecnologias

- **Front-end:** Vue 3 + Vue Router (hash history) + Vite
- **Servidor:** Express (`server.js`) servindo o build estático
- **Dados (Fase 1):** mock em `localStorage` (`src/data/api.js`)
- **Dados (Fase 2, planejado):** Supabase (`auth`, tabelas `leads`, `respostas_pesquisa`, `progresso`)
  chamado direto do browser, mantendo as mesmas assinaturas de `src/data/api.js`

> O app é hoje **100% front-end**. O `server.js` existe para permitir deploy como
> **Node app** (Hostinger Node.js, Render, Railway…). Se o alvo for hospedagem
> **estática** pura, basta subir o conteúdo de `dist/` — nesse caso o servidor não é usado.

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
    api.js             # camada de dados/auth (mock → Supabase na Fase 2)
    survey-schema.js   # schema da pesquisa
  views/               # Login, EsqueciSenha, RedefinirSenha, Pesquisa, Ambiente, Resultados
public/                # favicon
```
