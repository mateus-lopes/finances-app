<script setup lang="ts">
import type { AiAnalysisResult } from "../types";

defineProps<{ analysis: AiAnalysisResult }>();

const sentimentBadge = {
  positivo: "bg-green-400/15 text-green-400",
  neutro:   "bg-amber-400/15 text-amber-400",
  negativo: "bg-red-400/15 text-red-400",
};

const sentimentLabel = { positivo: "Positivo", neutro: "Neutro", negativo: "Negativo" };

const tipoColor = {
  positivo: "text-green-400",
  atencao:  "text-amber-400",
  negativo: "text-red-400",
};

const tipoBullet = { positivo: "●", atencao: "◆", negativo: "▲" };
</script>

<template>
  <div class="space-y-0">
    <!-- Step 1: Avaliação -->
    <div class="flex gap-3">
      <div class="flex flex-col items-center">
        <div class="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
        <div class="w-px flex-1 bg-border my-1" />
      </div>
      <div class="pb-4 flex-1 pt-0.5">
        <div class="flex items-center gap-2 mb-1.5">
          <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Avaliação</p>
          <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" :class="sentimentBadge[analysis.sentimento]">
            {{ sentimentLabel[analysis.sentimento] }}
          </span>
        </div>
        <p class="text-sm text-foreground leading-relaxed">{{ analysis.avaliacao }}</p>
      </div>
    </div>

    <!-- Step 2: Destaques -->
    <div class="flex gap-3">
      <div class="flex flex-col items-center">
        <div class="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
        <div class="w-px flex-1 bg-border my-1" />
      </div>
      <div class="pb-4 flex-1 pt-0.5">
        <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Destaques</p>
        <div class="space-y-2">
          <div v-for="(d, i) in analysis.destaques" :key="i" class="flex gap-2 items-start">
            <span class="text-[10px] mt-0.5 shrink-0" :class="tipoColor[d.tipo]">{{ tipoBullet[d.tipo] }}</span>
            <p class="text-xs text-foreground leading-relaxed">{{ d.texto }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 3: Sugestão -->
    <div class="flex gap-3">
      <div class="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
      <div class="flex-1 pt-0.5">
        <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Sugestão</p>
        <p class="text-sm text-foreground leading-relaxed">{{ analysis.sugestao }}</p>
      </div>
    </div>
  </div>
</template>
