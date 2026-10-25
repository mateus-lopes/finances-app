<script setup lang="ts">
import { ref, watch } from "vue";
import { useOnlineStatus } from "@/shared/composables/useOnlineStatus";

const { isOnline } = useOnlineStatus();
const showRestored = ref(false);
let timer: ReturnType<typeof setTimeout>;

watch(isOnline, (val) => {
  if (val) {
    showRestored.value = true;
    clearTimeout(timer);
    timer = setTimeout(() => { showRestored.value = false; }, 3000);
  } else {
    showRestored.value = false;
  }
});
</script>

<template>
  <Transition name="banner">
    <div
      v-if="!isOnline || showRestored"
      :class="[
        'fixed left-0 right-0 z-[100] flex items-center justify-center gap-2 px-4 text-sm font-medium text-white',
        isOnline ? 'bg-emerald-600/95' : 'bg-amber-600/95',
      ]"
      style="top: 0; padding-top: calc(0.6rem + env(safe-area-inset-top, 0px)); padding-bottom: 0.6rem;"
    >
      <svg v-if="!isOnline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="1" y1="1" x2="23" y2="23"/>
        <path d="M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01"/>
      </svg>
      <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <span>{{ isOnline ? "Conexão restaurada" : "Sem conexão · exibindo dados em cache" }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.banner-enter-active,
.banner-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.banner-enter-from,
.banner-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
