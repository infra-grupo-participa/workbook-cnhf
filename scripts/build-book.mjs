// build-book.mjs — gera o PDF-livro (apostila) do Workbook CNHF.
// Uso:
//   node scripts/build-book.mjs                          -> apostila EM BRANCO -> dist-book/workbook-cnhf-branco.pdf
//   node scripts/build-book.mjs --html                   -> só emite o HTML (sem Chrome, sumário sem nº de página)
//   node scripts/build-book.mjs --preenchido resp.json   -> PDF preenchido de um aluno (suporte)
//   node scripts/build-book.mjs --preenchido resp.json --aluno "Fulana de Tal"
//
// resp.json: { "cap-1-l1": "1.116", ... } ou o envelope do store { "cap-1-l1": {"v":"1.116","t":...} }.
//
// Sumário numerado (duas passadas): cada seção abre em página nova, então a
// paginação de cada uma é independente das demais. O build renderiza cada seção
// isolada, conta as páginas do PDF resultante, acumula os inícios e re-renderiza
// o livro final com os números injetados no sumário. Uma asserção confere que a
// soma das medições bate com o total do PDF final.
//
// Sem dependências externas. Usa Chrome/Edge headless (--print-to-pdf).

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { montarLivro } from './book-template.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT_DIR = resolve(ROOT, 'dist-book')
const MED_DIR = resolve(OUT_DIR, '.medicao')

/* ---------- CLI ---------- */
const argv = process.argv.slice(2)
const htmlOnly = argv.includes('--html')
function argValor(flag) {
  const i = argv.indexOf(flag)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : null
}
const respostasPath = argValor('--preenchido')
const aluno = argValor('--aluno') || ''
const variante = respostasPath ? 'preenchido' : 'branco'

let respostas = null
if (respostasPath) {
  const bruto = JSON.parse(readFileSync(resolve(respostasPath), 'utf-8'))
  // aceita string crua ou envelope {v,t} do store
  respostas = Object.fromEntries(Object.entries(bruto).map(([k, v]) =>
    [k, (v && typeof v === 'object') ? String(v.v ?? '') : String(v ?? '')]))
  console.log(`Respostas: ${respostasPath} (${Object.keys(respostas).length} campos)`)
}

/* ---------- fonte única ---------- */
const { WORKBOOK } = await import(pathToFileURL(resolve(ROOT, 'src/data/workbook-content.js')).href)
const logoDataUri = 'data:image/png;base64,'
  + readFileSync(resolve(ROOT, 'public/logo-cnhf.png')).toString('base64')

const base = `workbook-cnhf-${variante}`
mkdirSync(OUT_DIR, { recursive: true })

/* ---------- Chrome/Edge ---------- */
function acharChrome() {
  const env = process.env
  const candidatos = [
    env.CHROME_PATH,
    // Windows — Chrome e Edge (Edge é Chromium e serve)
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    env.LOCALAPPDATA && env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    // Linux
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium',
    '/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable',
  ].filter(Boolean)
  return candidatos.find(p => existsSync(p))
}

function renderPdf(chrome, html, nome) {
  mkdirSync(MED_DIR, { recursive: true })
  const htmlPath = resolve(MED_DIR, `${nome}.html`)
  const pdfPath = resolve(MED_DIR, `${nome}.pdf`)
  writeFileSync(htmlPath, html, 'utf-8')
  execFileSync(chrome, [
    '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
    `--print-to-pdf=${pdfPath}`, pathToFileURL(htmlPath).href,
  ], { stdio: 'pipe' })
  return readFileSync(pdfPath)
}

// Conta páginas do PDF do Chrome (Skia): dicionários fora de object streams,
// então "/Type /Page" e o "/Count N" do nó /Pages são texto plano.
function contarPaginasPdf(buf) {
  const s = buf.toString('latin1')
  const porTipo = (s.match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length
  const counts = [...s.matchAll(/\/Count\s+(\d+)/g)].map(m => +m[1])
  const porCount = counts.length ? Math.max(...counts) : 0
  if (porTipo && porCount && porTipo !== porCount) {
    console.warn(`AVISO: contagem ambígua de páginas (${porTipo} vs ${porCount}); usando ${porTipo}.`)
  }
  return porTipo || porCount
}

/* ---------- 1ª saída: HTML (sem números, p/ --html) ---------- */
const htmlSemNumeros = montarLivro({ WORKBOOK, logoDataUri, variante, respostas, aluno })
const htmlPath = resolve(OUT_DIR, `${base}.html`)
writeFileSync(htmlPath, htmlSemNumeros, 'utf-8')
console.log('HTML:', htmlPath, `(${htmlSemNumeros.length} bytes, ${WORKBOOK.length} seções)`)

if (htmlOnly) {
  console.log('--html: parando antes do PDF (sumário sem nº de página — a numeração exige medir com o Chrome).')
  process.exit(0)
}

const chrome = acharChrome()
if (!chrome) {
  console.error(`Chrome/Chromium não encontrado. Instale o Google Chrome ou o Microsoft Edge,
ou aponte o executável pela variável de ambiente CHROME_PATH, ex.:
  CHROME_PATH="/caminho/para/chrome" node scripts/build-book.mjs
(No Windows, Edge em "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" também serve.)`)
  process.exit(1)
}
console.log('Navegador:', chrome)

/* ---------- passada 1: medição ---------- */
console.log('Passada 1/2: medindo paginação por seção...')
const dummy = Object.fromEntries(WORKBOOK.map(s => [s.id, 888])) // reserva a largura do nº
const pagsSumario = contarPaginasPdf(renderPdf(chrome,
  montarLivro({ WORKBOOK, logoDataUri, variante, respostas, aluno, paginas: dummy, partes: { capa: false, sumario: true, secoes: [] } }),
  'sumario'))

const porSecao = {}
for (const sec of WORKBOOK) {
  const buf = renderPdf(chrome,
    montarLivro({ WORKBOOK, logoDataUri, variante, respostas, aluno, partes: { capa: false, sumario: false, secoes: [sec.id] } }),
    `sec-${sec.id}`)
  porSecao[sec.id] = contarPaginasPdf(buf)
}
console.log(`  capa: 1 pág · sumário: ${pagsSumario} pág · seções:`,
  WORKBOOK.map(s => `${s.id}=${porSecao[s.id]}`).join(' '))

const paginas = {}
let cursor = 1 + pagsSumario // capa + sumário
for (const sec of WORKBOOK) { paginas[sec.id] = cursor + 1; cursor += porSecao[sec.id] }
const totalEsperado = cursor

/* ---------- passada 2: livro final com sumário numerado ---------- */
console.log('Passada 2/2: renderizando o livro final...')
const htmlFinal = montarLivro({ WORKBOOK, logoDataUri, variante, respostas, aluno, paginas })
writeFileSync(htmlPath, htmlFinal, 'utf-8') // HTML final publicado já com números
const pdfBuf = renderPdf(chrome, htmlFinal, 'final')
const totalReal = contarPaginasPdf(pdfBuf)

const pdfPath = resolve(OUT_DIR, `${base}.pdf`)
writeFileSync(pdfPath, pdfBuf)
console.log('PDF:', pdfPath, `(${totalReal} páginas)`)

if (totalReal !== totalEsperado) {
  console.warn(`AVISO: total real (${totalReal}) difere do medido (${totalEsperado}) — os números do sumário podem estar defasados. Verifique manualmente.`)
} else {
  console.log(`Sumário conferido: medição bate com o total (${totalEsperado} páginas).`)
}

rmSync(MED_DIR, { recursive: true, force: true })
