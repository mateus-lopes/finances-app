<script setup lang="ts">
import { ref } from "vue";
import QuickAddModal from "./QuickAddModal.vue";
import QuickBillModal from "./QuickBillModal.vue";

const open = ref(false);
const modal = ref<"expense" | "income" | "bill" | null>(null);

function select(type: "expense" | "income" | "bill") {
  open.value = false;
  modal.value = type;
}
</script>

<template>
  <!-- Backdrop invisível para fechar -->
  <div v-if="open" class="fixed inset-0 z-30" @click="open = false" />

  <div class="fab-container fixed z-40 flex flex-col items-end">
    <!-- Opções do speed dial -->
    <div class="flex flex-col items-end gap-3 mb-3">
      <div v-if="open" class="flex items-center gap-2.5 animate-dial" style="animation-delay: 80ms">
        <span class="text-xs font-medium text-foreground bg-card border border-border rounded-full px-3 py-1 shadow-lg shadow-black/10 select-none">
          Recorrente
        </span>
        <button
          @click="select('bill')"
          aria-label="Recorrente"
          class="w-11 h-11 rounded-full bg-violet-500 text-white flex items-center justify-center shadow-lg shadow-violet-500/30 active:scale-90 transition-transform"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </button>
      </div>

      <div v-if="open" class="flex items-center gap-2.5 animate-dial" style="animation-delay: 40ms">
        <span class="text-xs font-medium text-foreground bg-card border border-border rounded-full px-3 py-1 shadow-lg shadow-black/10 select-none">
          Receita
        </span>
        <button
          @click="select('income')"
          aria-label="Receita"
          class="w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 active:scale-90 transition-transform"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
          </svg>
        </button>
      </div>

      <div v-if="open" class="flex items-center gap-2.5 animate-dial" style="animation-delay: 0ms">
        <span class="text-xs font-medium text-foreground bg-card border border-border rounded-full px-3 py-1 shadow-lg shadow-black/10 select-none">
          Despesa
        </span>
        <button
          @click="select('expense')"
          aria-label="Despesa"
          class="w-11 h-11 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 active:scale-90 transition-transform"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- FAB principal -->
    <button
      type="button"
      @click="open = !open"
      :class="[
        'w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 active:scale-90',
        open
          ? 'bg-card border border-border text-foreground shadow-black/10'
          : 'bg-primary text-primary-foreground shadow-primary/25'
      ]"
      aria-label="Ações rápidas"
    >
      <svg
        width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
        class="transition-transform duration-200"
        :class="open ? 'rotate-45' : ''"
      >
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>
  </div>

  <!-- Modais -->
  <QuickAddModal
    v-if="modal === 'expense' || modal === 'income'"
    :initial-type="modal"
    @close="modal = null"
  />
  <QuickBillModal
    v-if="modal === 'bill'"
    @close="modal = null"
  />
</template>

<style scoped>
.fab-container {
  bottom: calc(var(--nav-height) + 16px);
  right: max(20px, calc((100vw - 480px) / 2 + 20px));
}
@media (min-width: 1024px) {
  .fab-container {
    bottom: 24px;
    right: 24px;
  }
}
@keyframes dialIn {
  from { opacity: 0; transform: translateY(10px) scale(0.8); }
  to   { opacity: 1; transform: translateY(0)   scale(1);   }
}
.animate-dial {
  animation: dialIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
</style>
