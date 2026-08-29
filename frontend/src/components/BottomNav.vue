<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useThemeStore } from "../stores/theme";
import { useAuthStore } from "../stores/auth";

const route = useRoute();
const router = useRouter();
const theme = useThemeStore();
const auth = useAuthStore();
const drawerOpen = ref(false);

async function handleLogout() {
  drawerOpen.value = false;
  await auth.logout();
  router.push("/login");
}

const mainItems = [
  {
    to: "/",
    label: "Início",
    icon: `<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`,
  },
  {
    to: "/transacoes",
    label: "Transações",
    icon: `<path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>`,
  },
  {
    to: "/recorrentes",
    label: "Recorrentes",
    icon: `<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>`,
  },
];

const moreItems = [
  {
    to: "/gastos",
    label: "Gastos",
    icon: `<path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>`,
  },
  {
    to: "/contas",
    label: "Contas",
    icon: `<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>`,
  },
  {
    to: "/categorias",
    label: "Categorias",
    icon: `<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>`,
  },
  {
    to: "/importar",
    label: "Importar OFX",
    icon: `<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>`,
  },
];

const isMoreActive = computed(() => moreItems.some((i) => i.to === route.path));

function navigate(to: string) {
  drawerOpen.value = false;
  router.push(to);
}
</script>

<template>
  <!-- Backdrop do drawer -->
  <Transition name="fade">
    <div
      v-if="drawerOpen"
      class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      @click="drawerOpen = false"
    />
  </Transition>

  <!-- Drawer "Mais" -->
  <Transition name="slide-up">
    <div
      v-if="drawerOpen"
      class="fixed left-1/2 -translate-x-1/2 w-full max-w-lg z-50 bg-popover border-t border-border rounded-t-2xl shadow-2xl"
      :style="{ bottom: `calc(var(--nav-height) + var(--safe-bottom))` }"
    >
      <!-- Handle -->
      <div class="flex justify-center pt-3 pb-1">
        <div class="w-10 h-1 rounded-full bg-border" />
      </div>
      <p class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-center mb-3">Mais opções</p>
      <div class="grid grid-cols-4 gap-1 px-4 pb-2">
        <button
          v-for="item in moreItems"
          :key="item.to"
          type="button"
          @click="navigate(item.to)"
          class="flex flex-col items-center justify-center gap-2 py-4 rounded-xl transition-colors active:scale-95"
          :class="route.path === item.to ? 'bg-primary/15 text-primary' : 'bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary'"
        >
          <svg
            width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"
            v-html="item.icon"
          />
          <span class="text-[10px] font-medium">{{ item.label }}</span>
        </button>
      </div>
      <!-- Toggle de tema + Logout -->
      <div class="px-4 pb-5 pt-1 border-t border-border mt-1 flex flex-col gap-2">
        <button
          type="button"
          @click="theme.toggle()"
          class="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors active:scale-95"
        >
          <svg v-if="theme.isDark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
          </svg>
          <span class="text-sm font-medium">{{ theme.isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro' }}</span>
        </button>
        <button
          type="button"
          @click="handleLogout"
          class="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors active:scale-95"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span class="text-sm font-medium">Sair</span>
        </button>
      </div>
    </div>
  </Transition>

  <!-- Bottom Nav -->
  <nav
    class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-card/95 backdrop-blur-md border-t border-border z-50"
    :style="{ height: `calc(var(--nav-height) + var(--safe-bottom))`, paddingBottom: `var(--safe-bottom)` }"
  >
    <div class="flex h-[var(--nav-height)]">
      <RouterLink
        v-for="item in mainItems"
        :key="item.to"
        :to="item.to"
        class="flex flex-1 flex-col items-center justify-center gap-1 transition-colors group"
        :class="route.path === item.to ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
      >
        <svg
          width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"
          v-html="item.icon"
        />
        <span class="text-[9px] font-medium">{{ item.label }}</span>
      </RouterLink>

      <!-- Botão Mais -->
      <button
        type="button"
        @click="drawerOpen = !drawerOpen"
        class="flex flex-1 flex-col items-center justify-center gap-1 transition-colors"
        :class="isMoreActive || drawerOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/>
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
          <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>
        </svg>
        <span class="text-[9px] font-medium">Mais</span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateX(-50%) translateY(100%);
}
</style>
