<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

interface ToastItem {
  id: number;
  type: "success" | "error" | "info" | "warning";
  title: string;
  description?: string;
}

const toasts = ref<ToastItem[]>([]);
let counter = 0;

function add(item: Omit<ToastItem, "id">) {
  const id = ++counter;
  toasts.value.push({ ...item, id });
  setTimeout(() => remove(id), 3500);
}

function remove(id: number) {
  const idx = toasts.value.findIndex((t) => t.id === id);
  if (idx !== -1) toasts.value.splice(idx, 1);
}

const icons = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

const colors = {
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  error: "border-red-500/30 bg-red-500/10 text-red-400",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  info: "border-violet-500/30 bg-violet-500/10 text-violet-400",
};

function handler(e: CustomEvent<Omit<ToastItem, "id">>) {
  add(e.detail);
}

onMounted(() => window.addEventListener("app-toast", handler as EventListener));
onUnmounted(() => window.removeEventListener("app-toast", handler as EventListener));
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          :class="[
            'pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm',
            colors[t.type]
          ]"
        >
          <span class="text-sm font-bold mt-0.5">{{ icons[t.type] }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-foreground">{{ t.title }}</p>
            <p v-if="t.description" class="text-xs text-muted-foreground mt-0.5">{{ t.description }}</p>
          </div>
          <button @click="remove(t.id)" class="text-muted-foreground hover:text-foreground text-xs mt-0.5">✕</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from { opacity: 0; transform: translateY(-8px) scale(0.97); }
.toast-leave-to { opacity: 0; transform: translateY(-4px) scale(0.97); }
</style>
