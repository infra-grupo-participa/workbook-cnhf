/* ============================================================
   SERVIDOR DE PRODUÇÃO — Workbook CNHF
   ------------------------------------------------------------
   Serve o build (dist/) do Vite e faz o fallback de SPA.

   Robustez para Hostinger Node app: o processo pode ser reiniciado
   num contexto onde o dist/ ainda não está visível. Para nunca cair
   em 503 permanente:
     1) o servidor sobe IMEDIATAMENTE (health responde sempre);
     2) o caminho do dist/ é resolvido A CADA request (não fixado no boot);
     3) se o dist/ faltar, disparamos "npm run build" UMA vez em background
        (não-bloqueante) e servimos uma página "preparando..." com auto-reload
        até o build ficar pronto — sem travar o event loop nem matar o processo.

   Startup:  npm install → npm start   (o start builda se necessário)
   ============================================================ */

import express from 'express'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || '0.0.0.0'

// Resolve o dist/ dinamicamente: o cwd do runtime pode diferir do dir do
// server.js. Retorna o 1º candidato que tenha index.html, ou null.
function resolveDist() {
  const candidatos = [
    join(__dirname, 'dist'),
    join(process.cwd(), 'dist'),
    join(__dirname, '..', 'dist'),
  ]
  return candidatos.find((d) => existsSync(join(d, 'index.html'))) || null
}

// Dispara o build no máximo uma vez por processo, em background.
let building = false
function ensureBuild() {
  if (building || resolveDist()) return
  building = true
  console.warn('[workbook] dist/ ausente — iniciando "npm run build" em background...')
  const p = spawn('npm', ['run', 'build'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true, // necessário no Windows e em alguns ambientes de hospedagem
  })
  p.on('exit', (code) => {
    building = false
    console.log(`[workbook] build finalizado (code=${code}); dist ok=${!!resolveDist()}`)
  })
  p.on('error', (e) => {
    building = false
    console.error('[workbook] falha ao iniciar build:', e.message)
  })
}

const app = express()
app.set('trust proxy', true) // HTTPS/IP real atrás do proxy da hospedagem

// Healthcheck — responde SEMPRE, independente do dist/.
app.get('/health', (_req, res) =>
  res.json({ ok: true, service: 'workbook-cnhf', distOk: !!resolveDist(), building })
)

// ------------------------------------------------------------
// (FASE 2) Endpoints de back-end vão AQUI, antes do fallback SPA.
// ------------------------------------------------------------

// Estáticos + fallback SPA, resolvendo o dist/ a cada request.
app.use((req, res, next) => {
  const dist = resolveDist()
  if (!dist) {
    ensureBuild()
    // Página leve de "preparando" com auto-reload — evita tela de erro crua.
    return res
      .status(503)
      .set('Retry-After', '5')
      .type('html')
      .send(
        '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="5">' +
        '<title>Preparando…</title>' +
        '<body style="font:16px system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#0b0b0c;color:#eee">' +
        '<div style="text-align:center"><p>Preparando o ambiente…</p>' +
        '<p style="opacity:.6;font-size:13px">Isto leva alguns segundos. A página recarrega sozinha.</p></div>'
      )
  }
  // serve estáticos deste dist/
  express.static(dist, {
    index: false,
    setHeaders(r, filePath) {
      if (/[\\/]assets[\\/]/.test(filePath)) {
        r.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      }
    },
  })(req, res, () => {
    // não é arquivo estático → fallback SPA
    res.sendFile(join(dist, 'index.html'), (err) => {
      if (err && !res.headersSent) res.status(500).end()
    })
  })
})

// Nunca deixar o processo morrer por erro não tratado (evita 503 cíclico).
process.on('uncaughtException', (e) => console.error('[workbook] uncaughtException:', e))
process.on('unhandledRejection', (e) => console.error('[workbook] unhandledRejection:', e))

// Sobe já; se faltar build, dispara em background sem bloquear.
ensureBuild()
app.listen(PORT, HOST, () => {
  console.log(`[workbook] no ar em http://${HOST}:${PORT} (distOk=${!!resolveDist()})`)
})
