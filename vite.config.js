import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // base './' para funcionar servido de public_html (Hostinger) via caminho relativo
  base: './',
  server: { port: 5174, strictPort: true },
})
