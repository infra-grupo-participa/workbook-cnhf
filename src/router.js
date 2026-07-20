import { createRouter, createWebHashHistory } from 'vue-router'
import { currentUser, hasSurvey } from './data/api.js'

import Login from './views/Login.vue'
import EsqueciSenha from './views/EsqueciSenha.vue'
import RedefinirSenha from './views/RedefinirSenha.vue'
import Pesquisa from './views/Pesquisa.vue'
import Ambiente from './views/Ambiente.vue'
import Resultados from './views/Resultados.vue'

/*
  Rotas com hash (#/...) para funcionar em hospedagem estática (Hostinger)
  sem precisar de regra de rewrite no servidor.
*/
const routes = [
  { path: '/', name: 'ambiente', component: Ambiente, meta: { requiresAuth: true, requiresSurvey: true } },
  { path: '/login', name: 'login', component: Login },
  { path: '/esqueci-senha', name: 'esqueci', component: EsqueciSenha },
  { path: '/redefinir-senha', name: 'redefinir', component: RedefinirSenha },
  { path: '/pesquisa', name: 'pesquisa', component: Pesquisa, meta: { requiresAuth: true } },
  { path: '/resultado-das-pesquisas', name: 'resultados', component: Resultados, meta: { admin: true } },
  { path: '/:pathMatch(.*)*', redirect: '/login' },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// guarda de rota: autenticação + trava da pesquisa
router.beforeEach(async (to) => {
  const email = currentUser()

  if (to.meta.requiresAuth && !email) {
    return { name: 'login', query: { proximo: to.fullPath } }
  }
  if (to.meta.requiresSurvey && email) {
    const ok = await hasSurvey(email)
    if (!ok) return { name: 'pesquisa', query: { motivo: 'trava' } }
  }
  // já logado tentando ver login → manda pro destino certo
  if (to.name === 'login' && email) {
    const ok = await hasSurvey(email)
    return ok ? { name: 'ambiente' } : { name: 'pesquisa' }
  }
  return true
})
