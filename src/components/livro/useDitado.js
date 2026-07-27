/* ============================================================
   Ditado por voz (Web Speech API, pt-BR) — progressive enhancement.
   Só existe onde a API existe (Chrome/Edge); nos demais navegadores
   `suportado` é false e a UI nem renderiza o botão.
   ============================================================ */
import { ref } from 'vue'

export function criarDitado({ aoTexto, lang = 'pt-BR' } = {}) {
  const SR = typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)
  const suportado = !!SR
  const gravando = ref(false)
  let rec = null

  function iniciar() {
    if (!SR || gravando.value) return
    rec = new SR()
    rec.lang = lang
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal && r[0] && r[0].transcript) {
          const txt = r[0].transcript.trim()
          if (txt && typeof aoTexto === 'function') aoTexto(txt)
        }
      }
    }
    // o motor encerra sozinho em silêncio longo / permissão negada
    rec.onend = () => { gravando.value = false }
    rec.onerror = () => { gravando.value = false }
    try { rec.start(); gravando.value = true } catch { gravando.value = false }
  }

  function parar() {
    try { if (rec) rec.stop() } catch { /* já parado */ }
    gravando.value = false
  }

  function alternar() { gravando.value ? parar() : iniciar() }

  return { suportado, gravando, iniciar, parar, alternar }
}
