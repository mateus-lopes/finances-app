import type { RouteRecordRaw } from "vue-router";

export const identityRoutes: RouteRecordRaw[] = [
  { path: "/login", component: () => import("./views/LoginView.vue"), meta: { public: true, title: "Entrar" } },
  { path: "/redefinir-senha", component: () => import("./views/ResetPasswordView.vue"), meta: { public: true, title: "Redefinir senha" } },
];
