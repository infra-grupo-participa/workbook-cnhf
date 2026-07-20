import { createClient } from '@supabase/supabase-js'

/*
  URL e anon key do projeto. Preferimos as envs VITE_* (para trocar de
  ambiente sem mexer no código), mas caímos num fallback com os valores
  públicos do projeto — a anon key é PÚBLICA por design (vai para o
  browser de qualquer forma; o que protege os dados é a RLS no banco).
  Esse fallback garante que o build funcione em plataformas onde não dá
  para injetar env vars no momento do build (ex.: Hostinger Node app).
*/
const FALLBACK_URL = 'https://mbvybujpkwuorhtdzcde.supabase.co'
const FALLBACK_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1idnlidWpwa3d1b3JodGR6Y2RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2Nzk5MjYsImV4cCI6MjA4NzI1NTkyNn0.02UmV0FaJ4O8AaUOEjkKWlVfWKt1y0Nr8afcKRmUE0I'

const url = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_ANON

/*
  Client apontando por padrão para o schema `workbook` do projeto principal
  (mbvybujpkwuorhtdzcde). Auth nativo Supabase, sessão persistida no browser.
*/
export const supabase = createClient(url, anon, {
  db: { schema: 'workbook' },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
