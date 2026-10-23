<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useMonthStore } from "@/shared/stores/month";
import { useAiAnalysis } from "../composables/useAiAnalysis";
import AiDisplayV2 from "./AiDisplayV2.vue";

const monthStore = useMonthStore();
const { analysis, loading, error, analyze, loadOrFetch } = useAiAnalysis();

onMounted(() => loadOrFetch(monthStore.period));

watch(() => monthStore.period, (period) => {
  analysis.value = null;
  error.value = null;
  loadOrFetch(period);
});

function regenerate() {
  analyze(monthStore.period);
}
</script>

<template>
  <div class="rounded-xl border border-border bg-card p-4 mb-4">
    <div class="flex items-center justify-between mb-3">
      <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Análise do mês</p>
      <span class="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">IA</span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-2 py-2">
      <div class="h-3 bg-muted rounded animate-pulse w-full" />
      <div class="h-3 bg-muted rounded animate-pulse w-4/5" />
      <div class="h-3 bg-muted rounded animate-pulse w-3/5" />
      <div class="h-3 bg-muted rounded animate-pulse w-4/5 mt-3" />
      <div class="h-3 bg-muted rounded animate-pulse w-full" />
      <div class="h-3 bg-muted rounded animate-pulse w-2/3" />
    </div>

    <!-- Erro -->
    <div v-if="error && !loading" class="py-2">
      <p class="text-sm text-destructive mb-3">{{ error }}</p>
      <button @click="regenerate" class="text-xs text-primary hover:underline">Tentar novamente</button>
    </div>

    <!-- Resultado -->
    <div v-if="analysis && !loading">
      <AiDisplayV2 :analysis="analysis" />
      <div class="border-t border-border mt-4 pt-3">
        <button @click="regenerate" class="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Regenerar análise
        </button>
      </div>
    </div>
  </div>
</template>
