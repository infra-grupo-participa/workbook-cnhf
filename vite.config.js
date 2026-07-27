import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // base './' para funcionar servido de public_html (Hostinger) via caminho relativo
  base: './',
  server: {
    port: 5174,
    strictPort: true,
    /*
      O dev server do Vite não conhece as rotas do Express, e o fallback de SPA
      devolveria index.html para /api/* — o front receberia HTML onde espera
      JSON e o erro apareceria como "resposta inválida" em vez do código real.
      Com o proxy, `npm run dev` + `npm start` (noutro terminal) reproduzem
      produção. Alvo configurável porque a porta do server.js vem de PORT.
    */
    proxy: {
      '/api': {
        target: process.env.API_PROXY || 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
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
