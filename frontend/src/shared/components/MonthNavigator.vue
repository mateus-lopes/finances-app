<script setup lang="ts">
import { useMonthStore } from "@/shared/stores/month";

const monthStore = useMonthStore();
</script>

<template>
  <div class="flex items-center gap-1">
    <button
      type="button"
      @click="monthStore.prev"
      class="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
    </button>
    <span class="text-sm font-semibold text-foreground min-w-[130px] text-center capitalize">
      {{ monthStore.label }}
    </span>
    <button
      type="button"
      @click="monthStore.next"
      class="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </button>
  </div>
</template>
