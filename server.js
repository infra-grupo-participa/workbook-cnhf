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
import { execSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, 'dist')
const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || '0.0.0.0'

const app = express()

// Confia no proxy da hospedagem (Hostinger/Render/Railway) para
// HTTPS e IP real do cliente.
app.set('trust proxy', true)

// Garante que o build exista antes de subir.
// Garante o build. Em plataformas que rodam o build separadamente (Hostinger
// Node app), o dist/ já existe. Se não existir (ex.: start "cru"), buildamos
// aqui em vez de derrubar o processo — evita 503 por dist ausente no boot.
if (!existsSync(join(DIST, 'index.html'))) {
  console.warn('[workbook] dist/ ausente — rodando "vite build" no boot...')
  try {
    execSync('npm run build', { cwd: __dirname, stdio: 'inherit' })
  } catch (e) {
    console.error('[workbook] falha ao buildar no boot:', e.message)
    process.exit(1)
  }
}

// Healthcheck simples para a plataforma de deploy.
app.get('/health', (_req, res) => res.json({ ok: true, service: 'workbook-cnhf' }))

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
  res.sendFile(join(DIST, 'index.html'))
})

app.listen(PORT, HOST, () => {
  console.log(`[workbook] servindo dist/ em http://${HOST}:${PORT}`)
})
