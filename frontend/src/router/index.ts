import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", component: () => import("../views/LoginView.vue"), meta: { public: true } },
    { path: "/redefinir-senha", component: () => import("../views/ResetPasswordView.vue"), meta: { public: true } },
    { path: "/", component: () => import("../views/DashboardView.vue") },
    { path: "/transacoes", component: () => import("../views/TransactionsView.vue") },
    { path: "/gastos", component: () => import("../views/GastosView.vue") },
    { path: "/recorrentes", component: () => import("../views/BillsView.vue") },
    { path: "/contas", component: () => import("../views/AccountsView.vue") },
    { path: "/categorias", component: () => import("../views/CategoriesView.vue") },
    { path: "/importar", component: () => import("../views/ImportView.vue") },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.sessionChecked) await auth.checkSession();
  if (!to.meta["public"] && !auth.isAuthenticated) return "/login";
  if (to.meta["public"] && auth.isAuthenticated) return "/";
});

export default router;
