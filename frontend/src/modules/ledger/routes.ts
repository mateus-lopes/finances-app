import type { RouteRecordRaw } from "vue-router";

export const ledgerRoutes: RouteRecordRaw[] = [
  { path: "/transacoes", component: () => import("./views/TransactionsView.vue"), meta: { title: "Transações" } },
  { path: "/contas", component: () => import("./views/AccountsView.vue"), meta: { title: "Contas", hideMonthNavigator: true } },
  { path: "/categorias", component: () => import("./views/CategoriesView.vue"), meta: { title: "Categorias", hideMonthNavigator: true } },
];
