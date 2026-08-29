<script setup lang="ts">
import { computed } from "vue";
import Select from "./ui/Select.vue";
import type { UncategorizedGroup, Category } from "../composables/useGastos";

const props = defineProps<{
  groups: UncategorizedGroup[];
  categories: Category[];
  loading: boolean;
  rulesApplying: boolean;
  uncategorizedCount: number;
  lastAutoCategorized: number;
  lastRulesApplied: number;
}>();

const emit = defineEmits<{
  "auto-categorize": [];
  "apply-rules": [];
  "categorize-group": [group: UncategorizedGroup];
}>();

function fmt(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const categoryOptions = computed(() =>
  props.categories.map((c) => ({ label: c.name, value: String(c.id) }))
);
</script>

<template>
  <div class="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 mb-5">
    <!-- Header -->
    <div class="flex items-start justify-between gap-3 mb-3">
      <div class="flex items-center gap-2">
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          class="text-amber-500 flex-shrink-0"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span class="text-sm font-semibold text-amber-600 dark:text-amber-400">
          {{ uncategorizedCount }} transaç{{ uncategorizedCount === 1 ? "ão" : "ões" }} sem categoria
        </span>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <!-- Aplicar Regras (determinístico, hardcoded) -->
        <button
          type="button"
          :disabled="rulesApplying || loading"
          @click="emit('apply-rules')"
          class="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <svg
            v-if="rulesApplying"
            class="animate-spin"
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2"
          >
            <path d="M21 12a9 9 0 11-6.219-8.56"/>
          </svg>
          <svg
            v-else
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
          </svg>
          {{ rulesApplying ? "Aplicando..." : "Aplicar Regras" }}
        </button>
        <!-- Auto-categorizar (por histórico) -->
        <button
          type="button"
          :disabled="loading || rulesApplying"
          @click="emit('auto-categorize')"
          class="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <svg
            v-if="loading"
            class="animate-spin"
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2"
          >
            <path d="M21 12a9 9 0 11-6.219-8.56"/>
          </svg>
          <svg
            v-else
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          {{ loading ? "Categorizando..." : "Auto-categorizar" }}
        </button>
      </div>
    </div>

    <!-- Feedback de regras aplicadas -->
    <p v-if="lastRulesApplied > 0" class="text-xs text-violet-400 mb-1">
      ✓ {{ lastRulesApplied }} categorizad{{ lastRulesApplied === 1 ? "a" : "as" }} pelas regras
    </p>
    <!-- Feedback de auto-categorização por histórico -->
    <p v-if="lastAutoCategorized > 0" class="text-xs text-emerald-500 mb-3">
      ✓ {{ lastAutoCategorized }} categorizad{{ lastAutoCategorized === 1 ? "a" : "as" }} pelo histórico
    </p>

    <!-- Lista de grupos para revisão manual -->
    <div v-if="groups.length > 0" class="space-y-2">
      <p class="text-xs text-muted-foreground mb-2">Revisar manualmente:</p>
      <div
        v-for="group in groups"
        :key="group.key"
        class="flex items-center gap-2 rounded-lg bg-background/60 px-3 py-2"
      >
        <div class="flex-1 min-w-0">
          <p class="text-xs font-medium text-foreground truncate">{{ group.displayName }}</p>
          <p class="text-[10px] text-muted-foreground">
            {{ group.count }}x · {{ fmt(group.total) }}
          </p>
        </div>
        <Select
          v-model="group.selectedCategoryId"
          :options="categoryOptions"
          placeholder="Categoria..."
          class="w-36 h-8 text-xs"
        />
        <button
          type="button"
          :disabled="!group.selectedCategoryId || loading"
          @click="emit('categorize-group', group)"
          class="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </div>
    </div>

    <p v-else-if="!loading" class="text-xs text-muted-foreground mt-1">
      Clique em "Auto-categorizar" para usar o histórico de transações anteriores.
    </p>
  </div>
</template>
