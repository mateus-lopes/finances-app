import { createRouter, createWebHistory } from "vue-router";
import { identityRoutes, useAuthStore } from "@/modules/identity";
import { insightsRoutes } from "@/modules/insights";
import { ledgerRoutes } from "@/modules/ledger";
import { planningRoutes } from "@/modules/planning";
import { importingRoutes } from "@/modules/importing";

declare module "vue-router" {
  interface RouteMeta {
    /** Rota acessível sem login. */
    public?: boolean;
    /** Título exibido no cabeçalho do layout desktop. */
    title?: string;
    /** Telas que não dependem da competência escondem o navegador de meses. */
    hideMonthNavigator?: boolean;
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    ...identityRoutes,
    ...insightsRoutes,
    ...ledgerRoutes,
    ...planningRoutes,
    ...importingRoutes,
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.sessionChecked) await auth.checkSession();
  if (!to.meta.public && !auth.isAuthenticated) return "/login";
  if (to.meta.public && auth.isAuthenticated) return "/";
});

export default router;
