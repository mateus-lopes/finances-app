<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const navItems = [
  { to: "/",            label: "Dashboard",   icon: `<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>` },
  { to: "/transacoes",  label: "Transações",  icon: `<path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>` },
  { to: "/recorrentes", label: "Recorrentes", icon: `<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>` },
  { to: "/contas",      label: "Contas",      icon: `<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>` },
  { to: "/categorias",  label: "Categorias",  icon: `<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>` },
  { to: "/importar",   label: "Importar OFX", icon: `<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>` },
];

async function logout() {
  await auth.logout();
  router.push("/login");
}
</script>

<template>
  <aside class="fixed left-0 top-0 h-screen w-16 lg:w-56 bg-card border-r border-border flex flex-col z-50 transition-all">
    <!-- Logo -->
    <div class="h-16 flex items-center justify-center lg:justify-start px-4 border-b border-border">
      <div class="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
        <span class="text-base leading-none">💰</span>
      </div>
      <span class="hidden lg:block ml-3 text-sm font-semibold text-foreground">Controle Financeiro</span>
    </div>

    <!-- Nav -->
    <nav class="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        :class="[
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
          route.path === item.to
            ? 'bg-primary/15 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
        ]"
        :title="item.label"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0" v-html="item.icon" />
        <span class="hidden lg:block">{{ item.label }}</span>
      </RouterLink>

    </nav>

    <!-- Footer -->
    <div class="border-t border-border p-3">
      <div class="flex items-center gap-3 rounded-lg px-1 py-2">
        <div class="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold flex-shrink-0">
          {{ auth.user?.name?.charAt(0)?.toUpperCase() }}
        </div>
        <div class="hidden lg:block flex-1 min-w-0">
          <p class="text-xs font-medium text-foreground truncate">{{ auth.user?.name }}</p>
          <p class="text-xs text-muted-foreground truncate">{{ auth.user?.email }}</p>
        </div>
        <button
          type="button"
          @click="logout"
          class="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="Sair"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </div>
  </aside>
</template>
