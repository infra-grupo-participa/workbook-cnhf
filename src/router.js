import { createRouter, createWebHashHistory } from 'vue-router'
import { currentUser, hasSurvey, isAdmin } from './data/api.js'

// Views carregadas sob demanda (code-splitting): cada rota vira um chunk
// próprio, então o bundle inicial (login/pesquisa) não carrega o conteúdo do
// workbook (~55 KB) nem o Resultados/admin até serem realmente acessados.
import Login from './views/Login.vue'          // eager: 1ª tela do funil
import Pesquisa from './views/Pesquisa.vue'    // eager: porta de entrada pública
const AcessoInterno = () => import('./views/AcessoInterno.vue')
const Ambiente = () => import('./views/Ambiente.vue')
const Workbook = () => import('./views/Workbook.vue')
const Anotacoes = () => import('./views/Anotacoes.vue')
const Resultados = () => import('./views/Resultados.vue')

/*
  Rotas com hash (#/...) para funcionar em hospedagem estática (Hostinger)
  sem precisar de regra de rewrite no servidor.
*/
const routes = [
  { path: '/', name: 'ambiente', component: Ambiente, meta: { requiresAuth: true, requiresSurvey: true } },
  { path: '/login', name: 'login', component: Login },
  { path: '/acesso-interno', name: 'acesso-interno', component: AcessoInterno },
  // LOGIN CRU (decisão do dono do produto, 2026-08-11): não há mais senha
  // nem recuperação — os caminhos abaixo são redirects legados. Há disparo
  // de WhatsApp NA RUA apontando para `/entrar` e `/recuperar-acesso`; se
  // virarem 404, o aluno bate em parede. Mantidos por tempo indeterminado.
  { path: '/entrar', redirect: { name: 'login' } },
  { path: '/recuperar-acesso', redirect: { name: 'login' } },
  { path: '/esqueci-senha', redirect: { name: 'login' } },
  { path: '/redefinir-senha', redirect: { name: 'login' } },
  // pesquisa é PÚBLICA: é a porta de entrada do funil (link compartilhável).
  // Lead novo responde aqui e ganha o acesso ao final. Aluno logado sem
  // pesquisa também cai aqui pelo gate (requiresSurvey).
  { path: '/pesquisa', name: 'pesquisa', component: Pesquisa },
  { path: '/workbook', name: 'workbook', component: Workbook, meta: { requiresAuth: true, requiresSurvey: true } },
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
