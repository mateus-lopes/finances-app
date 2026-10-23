import type { RouteRecordRaw } from "vue-router";

export const planningRoutes: RouteRecordRaw[] = [
  { path: "/recorrentes", component: () => import("./views/BillsView.vue"), meta: { title: "Recorrentes" } },
];
