// build-book.mjs — gera o PDF-livro (apostila) do Workbook CNHF.
// Uso:
//   node scripts/build-book.mjs                 -> apostila EM BRANCO -> dist-book/workbook-cnhf-branco.pdf
//   node scripts/build-book.mjs --html          -> só emite o HTML (sem Chrome)
// Sem dependências externas. Usa Chrome headless (--print-to-pdf) p/ render.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { montarLivro } from './book-template.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT_DIR = resolve(ROOT, 'dist-book')
const argv = process.argv.slice(2)
const htmlOnly = argv.includes('--html')

// 1. fonte única
const { WORKBOOK } = await import(pathToFileURL(resolve(ROOT, 'src/data/workbook-content.js')).href)

// 2. logo -> data URI
const logoPath = resolve(ROOT, 'public/logo-cnhf.png')
const logoDataUri = 'data:image/png;base64,' + readFileSync(logoPath).toString('base64')

// 3. HTML (variante branco)
const html = montarLivro({ WORKBOOK, logoDataUri, variante: 'branco' })

mkdirSync(OUT_DIR, { recursive: true })
const htmlPath = resolve(OUT_DIR, 'workbook-cnhf-branco.html')
writeFileSync(htmlPath, html, 'utf-8')
console.log('HTML:', htmlPath, `(${html.length} bytes, ${WORKBOOK.length} seções)`)

if (htmlOnly) { console.log('--html: parando antes do PDF.'); process.exit(0) }

// 4. Chrome headless -> PDF
const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
]
const chrome = CHROME_CANDIDATES.find(p => existsSync(p))
if (!chrome) { console.error('Chrome não encontrado.'); process.exit(1) }

const pdfPath = resolve(OUT_DIR, 'workbook-cnhf-branco.pdf')
const fileUrl = pathToFileURL(htmlPath).href
console.log('Renderizando PDF via Chrome headless...')
execFileSync(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--no-pdf-header-footer',
  `--print-to-pdf=${pdfPath}`,
  '--print-to-pdf-no-header',
  fileUrl,
], { stdio: 'inherit' })
console.log('PDF:', pdfPath)
