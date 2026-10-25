<script setup lang="ts">
import { useRegisterSW } from "virtual:pwa-register/vue";

const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegistered(r) {
    r && setInterval(() => r.update(), 60 * 60 * 1000);
  },
});
</script>

<template>
  <Transition name="slide-up">
    <div
      v-if="needRefresh"
      class="fixed left-1/2 -translate-x-1/2 w-full max-w-lg z-[110] px-4"
      style="bottom: calc(var(--nav-height) + env(safe-area-inset-bottom, 0px) + 8px)"
    >
      <div class="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-2xl">
        <div class="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-foreground">Atualização disponível</p>
          <p class="text-xs text-muted-foreground mt-0.5">Nova versão do app disponível.</p>
        </div>
        <button
          @click="updateServiceWorker(true)"
          class="flex-shrink-0 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 active:scale-95 transition-all"
        >
          Atualizar
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateX(-50%) translateY(100%);
  opacity: 0;
}
</style>
