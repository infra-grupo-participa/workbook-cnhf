/* ============================================================
   SERVIDOR DE PRODUÇÃO — Workbook CNHF
   ------------------------------------------------------------
   Serve o build estático (dist/) gerado pelo Vite e faz o
   fallback de SPA para o index.html.

   O app hoje é 100% front-end (dados em localStorage; Fase 2 =
   Supabase chamado direto do browser), então este servidor só
   entrega os arquivos estáticos. Se no futuro precisar de
   endpoints de back-end (proxy Supabase, envio de e-mail, etc.),
   basta declará-los ANTES do fallback de SPA marcado abaixo.

   Startup:
     npm install
     npm run build     # gera dist/
     npm start         # sobe este servidor (porta via env PORT)
   ============================================================ */

import express from 'express'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || '0.0.0.0'

// Resolve a pasta dist/ de forma robusta: em algumas plataformas o cwd do
// runtime difere do diretório do server.js. Procuramos nos locais prováveis.
const CANDIDATOS = [
  join(__dirname, 'dist'),
  join(process.cwd(), 'dist'),
  join(__dirname, '..', 'dist'),
]
const DIST = CANDIDATOS.find((d) => existsSync(join(d, 'index.html'))) || CANDIDATOS[0]

const app = express()

// Confia no proxy da hospedagem (Hostinger/Render/Railway) para
// HTTPS e IP real do cliente.
app.set('trust proxy', true)

// O build (dist/) é gerado na fase de build da plataforma. NÃO buildamos nem
// derrubamos o processo em runtime — fazer isso trava o boot e gera 503 em loop.
// Se o dist/ faltar, o servidor sobe mesmo assim e reporta o estado (melhor que
// um processo que morre e reinicia sem parar).
const distOk = existsSync(join(DIST, 'index.html'))
if (!distOk) {
  console.error(`[workbook] AVISO: ${join(DIST, 'index.html')} não encontrado. Rode "npm run build".`)
}

// Healthcheck simples para a plataforma de deploy. Sempre responde.
app.get('/health', (_req, res) =>
  res.json({ ok: true, service: 'workbook-cnhf', distOk })
)

// ------------------------------------------------------------
// (FASE 2) Endpoints de back-end vão AQUI, antes do fallback SPA.
// Ex.: app.use('/api', apiRouter)
// ------------------------------------------------------------

// Arquivos estáticos do build (JS/CSS/assets com hash → cache longo).
app.use(
  express.static(DIST, {
    index: false,
    setHeaders(res, filePath) {
      if (filePath.includes(`${join('dist', 'assets')}`) || /\/assets\//.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      }
    },
  })
)

// Fallback de SPA: qualquer rota não-arquivo devolve o index.html.
// (O vue-router usa hash history, mas isso garante que /login, etc.
//  abram o app mesmo se alguém digitar o caminho direto.)
app.get('*', (req, res) => {
  const index = join(DIST, 'index.html')
  if (!existsSync(index)) {
    return res.status(503).type('text/plain').send('Build ausente. Rode "npm run build".')
  }
  res.sendFile(index, (err) => {
    if (err && !res.headersSent) res.status(500).end()
  })
})

// Nunca deixar o processo morrer por um erro não tratado (evita 503 cíclico).
process.on('uncaughtException', (e) => console.error('[workbook] uncaughtException:', e))
process.on('unhandledRejection', (e) => console.error('[workbook] unhandledRejection:', e))

app.listen(PORT, HOST, () => {
  console.log(`[workbook] servindo dist/ em http://${HOST}:${PORT} (distOk=${distOk})`)
})
