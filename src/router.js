import { createRouter, createWebHashHistory } from 'vue-router'
import { currentUser, hasSurvey, isAdmin } from './data/api.js'

// Views carregadas sob demanda (code-splitting): cada rota vira um chunk
// próprio, então o bundle inicial (login/pesquisa) não carrega o conteúdo do
// workbook (~55 KB) nem o Resultados/admin até serem realmente acessados.
import Login from './views/Login.vue'          // eager: 1ª tela do funil
import Pesquisa from './views/Pesquisa.vue'    // eager: porta de entrada pública
const CriarAcesso = () => import('./views/CriarAcesso.vue')
const RecuperarAcesso = () => import('./views/RecuperarAcesso.vue')
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
  { path: '/criar-acesso', name: 'criar-acesso', component: CriarAcesso },
  // Recuperação de acesso sem e-mail: e-mail + WhatsApp do cadastro + senha
  // nova, numa tela só (decisão do João, 2026-07-27).
  { path: '/recuperar-acesso', name: 'recuperar', component: RecuperarAcesso },
  // Fluxo ANTIGO por e-mail — links já enviados a alunos não podem dar 404.
  // O link de recovery do Supabase chega com o token no hash; ao redirecionar,
  // o aluno simplesmente usa a tela nova (e-mail + WhatsApp), sem depender
  // do token.
  { path: '/esqueci-senha', redirect: { name: 'recuperar' } },
  { path: '/redefinir-senha', redirect: { name: 'recuperar' } },
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
