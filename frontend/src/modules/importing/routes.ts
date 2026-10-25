import type { RouteRecordRaw } from "vue-router";

export const importingRoutes: RouteRecordRaw[] = [
  { path: "/importar", component: () => import("./views/ImportView.vue"), meta: { title: "Importar OFX" } },
];
