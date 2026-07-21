import { createRouter, createWebHashHistory } from 'vue-router'
import { currentUser, hasSurvey, isAdmin } from './data/api.js'

import Login from './views/Login.vue'
import CriarAcesso from './views/CriarAcesso.vue'
import EsqueciSenha from './views/EsqueciSenha.vue'
import RedefinirSenha from './views/RedefinirSenha.vue'
import Pesquisa from './views/Pesquisa.vue'
import Ambiente from './views/Ambiente.vue'
import Anotacoes from './views/Anotacoes.vue'
import Resultados from './views/Resultados.vue'

/*
  Rotas com hash (#/...) para funcionar em hospedagem estática (Hostinger)
  sem precisar de regra de rewrite no servidor.
*/
const routes = [
  { path: '/', name: 'ambiente', component: Ambiente, meta: { requiresAuth: true, requiresSurvey: true } },
  { path: '/login', name: 'login', component: Login },
  { path: '/criar-acesso', name: 'criar-acesso', component: CriarAcesso },
  { path: '/esqueci-senha', name: 'esqueci', component: EsqueciSenha },
  { path: '/redefinir-senha', name: 'redefinir', component: RedefinirSenha },
  // pesquisa é PÚBLICA: é a porta de entrada do funil (link compartilhável).
  // Lead novo responde aqui e ganha o acesso ao final. Aluno logado sem
  // pesquisa também cai aqui pelo gate (requiresSurvey).
  { path: '/pesquisa', name: 'pesquisa', component: Pesquisa },
  { path: '/minhas-anotacoes', name: 'anotacoes', component: Anotacoes, meta: { requiresAuth: true } },
  { path: '/resultado-das-pesquisas', name: 'resultados', component: Resultados, meta: { requiresAuth: true, admin: true } },
  { path: '/:pathMatch(.*)*', redirect: '/login' },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// guarda de rota: autenticação + trava da pesquisa + admin
router.beforeEach(async (to) => {
  const email = currentUser()

  if (to.meta.requiresAuth && !email) {
    return { name: 'login', query: { proximo: to.fullPath } }
  }
  if (to.meta.admin) {
    if (!email) return { name: 'login', query: { proximo: to.fullPath } }
    if (!(await isAdmin())) return { name: 'ambiente' }
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
