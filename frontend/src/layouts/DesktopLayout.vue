<script setup lang="ts">
import DesktopSidebar from "../components/DesktopSidebar.vue";
import MonthNavigator from "../components/MonthNavigator.vue";
import { useAuthStore } from "../stores/auth";
import { useThemeStore } from "../stores/theme";
import { useRoute } from "vue-router";

const auth = useAuthStore();
const theme = useThemeStore();
const route = useRoute();

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/transacoes": "Transações",
  "/recorrentes": "Recorrentes",
  "/contas": "Contas",
  "/categorias": "Categorias",
};
</script>

<template>
  <div class="flex min-h-screen bg-background">
    <DesktopSidebar />

    <div class="flex-1 flex flex-col min-h-screen pl-16 lg:pl-56 transition-all">
      <!-- Header -->
      <header class="sticky top-0 z-40 h-16 bg-card/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-6 gap-4">
        <h1 class="text-base font-semibold text-foreground">{{ PAGE_TITLES[route.path] ?? "Controle Financeiro" }}</h1>
        <MonthNavigator v-if="auth.isAuthenticated && route.path !== '/categorias'" />
        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="theme.toggle()"
            class="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            :title="theme.isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'"
          >
            <!-- Sol (tema claro visível quando está no escuro) -->
            <svg v-if="theme.isDark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
            <!-- Lua (tema escuro visível quando está no claro) -->
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            </svg>
          </button>

        </div>
      </header>

      <!-- Content -->
      <main class="flex-1 p-6 overflow-y-auto">
        <div class="max-w-4xl mx-auto">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>
