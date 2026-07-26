import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // base './' para funcionar servido de public_html (Hostinger) via caminho relativo
  base: './',
  server: { port: 5174, strictPort: true },
  build: {
    rollupOptions: {
      output: {
        // separa dependências pesadas em chunks de vendor: elas não mudam entre
        // deploys de conteúdo/UI, então o navegador reaproveita do cache.
        manualChunks: {
          supabase: ['@supabase/supabase-js'],
          vue: ['vue', 'vue-router'],
        },
      },
    },
  },
})
