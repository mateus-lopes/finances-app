import type { RouteRecordRaw } from "vue-router";

export const insightsRoutes: RouteRecordRaw[] = [
  { path: "/", component: () => import("./views/DashboardView.vue"), meta: { title: "Dashboard" } },
  { path: "/gastos", component: () => import("./views/AnalysisView.vue"), meta: { title: "Análise" } },
];
