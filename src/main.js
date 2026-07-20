import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router.js'
import { initAuth } from './data/api.js'
import './styles.css'

// Resolve a sessão do Supabase antes de montar, para que currentUser()
// (síncrono) já reflita o usuário logado no 1º render e nas guardas de rota.
initAuth().finally(() => {
  createApp(App).use(router).mount('#app')
})
