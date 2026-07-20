import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anon) {
  // Falha cedo e clara em dev; em prod o build injeta as envs VITE_*.
  console.error('[workbook] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes. Veja .env.example')
}

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
