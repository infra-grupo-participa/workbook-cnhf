import { createClient } from '@supabase/supabase-js'

/*
  URL e anon key do projeto. Preferimos as envs VITE_* (para trocar de
  ambiente sem mexer no código), mas caímos num fallback com os valores
  públicos do projeto — a anon key é PÚBLICA por design (vai para o
  browser de qualquer forma; o que protege os dados é a RLS no banco).
  Esse fallback garante que o build funcione em plataformas onde não dá
  para injetar env vars no momento do build (ex.: Hostinger Node app).
*/
// exportadas para o beacon de unload (api.js) não depender de propriedades
// `protected` do supabase-js (supabase.supabaseUrl / .supabaseKey), que somem
// num bump de minor e fariam o último lote de respostas do aluno se perder em silêncio
const FALLBACK_URL = 'https://mbvybujpkwuorhtdzcde.supabase.co'
const FALLBACK_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1idnlidWpwa3d1b3JodGR6Y2RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2Nzk5MjYsImV4cCI6MjA4NzI1NTkyNn0.02UmV0FaJ4O8AaUOEjkKWlVfWKt1y0Nr8afcKRmUE0I'

const url = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_ANON

export const SUPABASE_URL = url
export const SUPABASE_ANON = anon

/*
  Client apontando por padrão para o schema `workbook` do projeto principal
  (mbvybujpkwuorhtdzcde). Auth nativo Supabase, sessão persistida no browser.
*/
/*
  `cache: 'no-store'` em toda chamada: nenhuma camada de cache HTTP pode servir
  uma leitura do PostgREST. Isso importa porque `saveWorkbook` faz
  read-merge-write — mesclar sobre um snapshot velho apaga do banco campos que
  existem, silenciosamente. Defesa independente do service worker (que já não
  intercepta o Supabase), porque o front não pode confiar em quem serviu a
  resposta.
*/
const fetchSemCache = (input, init = {}) => fetch(input, { ...init, cache: 'no-store' })

export const supabase = createClient(url, anon, {
  db: { schema: 'workbook' },
  global: { fetch: fetchSemCache },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
