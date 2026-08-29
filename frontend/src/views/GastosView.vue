<script setup lang="ts">
import { computed } from "vue";
import { useGastos } from "../composables/useGastos";
import { useToast } from "../composables/useToast";
import MonthNavigator from "../components/MonthNavigator.vue";
import QuickCategorizePanel from "../components/QuickCategorizePanel.vue";
import Progress from "../components/ui/Progress.vue";
import Skeleton from "../components/ui/Skeleton.vue";

const {
  dashboardData,
  historyData,
  uncategorizedGroups,
  categories,
  loading,
  categorizing,
  rulesApplying,
  lastAutoCategorized,
  lastRulesApplied,
  hasUncategorized,
  uncategorizedCount,
  autoCategorize,
  applyRules,
  categorizeGroup,
} = useGastos();

const { success, error } = useToast();

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const PALETTE = ["#a78bfa","#34d399","#fb923c","#60a5fa","#f472b6","#facc15","#38bdf8","#4ade80"];

function fmt(value: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
}

function fmtK(v: number | string | null | undefined) {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1000) return `R$${(n / 1000).toFixed(1)}k`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
}

// ── KPIs ─────────────────────────────────────────────────────────────────
const kpis = computed(() => {
  const d = dashboardData.value;
  if (!d) return [];
  const rate = d.totalIncome > 0 ? Math.max(0, Math.min(100, (d.saldo / d.totalIncome) * 100)) : 0;
  return [
    { label: "Receitas", value: fmt(d.totalIncome), color: "text-emerald-400" },
    { label: "Despesas", value: fmt(d.totalExpenses), color: "text-rose-400" },
    { label: "Saldo", value: fmt(d.saldo), color: d.saldo >= 0 ? "text-emerald-400" : "text-rose-400" },
    { label: "Taxa de poupança", value: `${rate.toFixed(0)}%`, color: rate >= 30 ? "text-emerald-400" : rate >= 15 ? "text-amber-400" : "text-rose-400" },
  ];
});

// ── Donut de categorias ────────────────────────────────────────────────
const donutOptions = computed(() => {
  const cats = (dashboardData.value?.categoriesBreakdown ?? []).filter(c => Number(c.total) > 0);
  if (!cats.length) return null;
  return {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "#1c1c2e",
      borderColor: "rgba(255,255,255,0.08)",
      textStyle: { color: "#f8f8f8", fontSize: 12 },
      formatter: (p: { name: string; value: number; percent: number }) =>
        `<b>${p.name}</b><br/>${fmt(p.value)} (${p.percent.toFixed(0)}%)`,
    },
    legend: { show: false },
    series: [{
      type: "pie",
      radius: ["55%", "80%"],
      center: ["50%", "50%"],
      label: { show: false },
      emphasis: { scale: true, scaleSize: 5 },
      data: cats.map((c, i) => ({
        name: c.categoryName ?? "Sem categoria",
        value: Number(c.total),
        itemStyle: { color: c.categoryColor ?? PALETTE[i % PALETTE.length] },
      })),
    }],
  };
});

// ── Bar horizontal top categorias ─────────────────────────────────────
const barCatsOptions = computed(() => {
  const cats = (dashboardData.value?.categoriesBreakdown ?? [])
    .filter(c => Number(c.total) > 0)
    .sort((a, b) => Number(b.total) - Number(a.total))
    .slice(0, 8);
  if (!cats.length) return null;
  return {
    backgroundColor: "transparent",
    grid: { top: 4, bottom: 4, left: 80, right: 60 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "none" },
      backgroundColor: "#1c1c2e",
      borderColor: "rgba(255,255,255,0.08)",
      textStyle: { color: "#f8f8f8", fontSize: 11 },
      formatter: (p: { name: string; value: number }[]) => `<b>${p[0].name}</b><br/>${fmt(p[0].value)}`,
    },
    xAxis: { type: "value", show: false },
    yAxis: {
      type: "category",
      data: cats.map(c => c.categoryName ?? "Sem categoria"),
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#94a3b8", fontSize: 11, width: 76, overflow: "truncate" },
    },
    series: [{
      type: "bar",
      data: cats.map((c, i) => ({
        value: Number(c.total),
        itemStyle: { color: c.categoryColor ?? PALETTE[i % PALETTE.length], borderRadius: [0, 4, 4, 0] },
      })),
      barWidth: 14,
      label: {
        show: true,
        position: "right",
        formatter: (p: { value: number }) => fmtK(p.value),
        color: "#94a3b8",
        fontSize: 10,
      },
    }],
  };
});

// ── Bar histórico 6 meses ──────────────────────────────────────────────
const barHistOptions = computed(() => {
  if (!historyData.value.length) return null;
  const months = historyData.value;
  return {
    backgroundColor: "transparent",
    grid: { top: 12, bottom: 24, left: 52, right: 12 },
    tooltip: {
      trigger: "axis",
      backgroundColor: "#1c1c2e",
      borderColor: "rgba(255,255,255,0.08)",
      textStyle: { color: "#f8f8f8", fontSize: 11 },
      formatter: (p: { seriesName: string; value: number }[]) =>
        p.map(s => `${s.seriesName}: ${fmt(s.value)}`).join("<br/>"),
    },
    legend: {
      data: ["Receitas", "Despesas"],
      top: 0,
      right: 0,
      textStyle: { color: "#94a3b8", fontSize: 10 },
      itemWidth: 10,
      itemHeight: 10,
    },
    xAxis: {
      type: "category",
      data: months.map(m => MONTH_NAMES[m.month - 1]),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#94a3b8", fontSize: 10 },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#94a3b8", fontSize: 9, formatter: (v: number) => fmtK(v) },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
    },
    series: [
      {
        name: "Receitas",
        type: "bar",
        data: months.map(m => m.income),
        itemStyle: { color: "#34d399", borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 24,
      },
      {
        name: "Despesas",
        type: "bar",
        data: months.map(m => m.expenses),
        itemStyle: { color: "#f87171", borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 24,
      },
    ],
  };
});

// ── Poupança ──────────────────────────────────────────────────────────
const savingsRate = computed(() => {
  const d = dashboardData.value;
  if (!d || d.totalIncome === 0) return 0;
  return Math.max(0, Math.min(100, (d.saldo / d.totalIncome) * 100));
});

const savingsColor = computed(() =>
  savingsRate.value >= 30 ? "#34d399" : savingsRate.value >= 15 ? "#fbbf24" : "#f87171"
);

// ── Handlers ──────────────────────────────────────────────────────────
async function handleApplyRules() {
  try {
    await applyRules();
    if (lastRulesApplied.value > 0) {
      success(`${lastRulesApplied.value} transaç${lastRulesApplied.value === 1 ? "ão categorizada" : "ões categorizadas"} pelas regras`);
    } else {
      success("Nenhuma transação nova reconhecida pelas regras");
    }
  } catch {
    error("Erro ao aplicar regras");
  }
}

async function handleAutoCategorize() {
  try {
    await autoCategorize();
    if (lastAutoCategorized.value > 0) {
      success(`${lastAutoCategorized.value} transaç${lastAutoCategorized.value === 1 ? "ão categorizada" : "ões categorizadas"} automaticamente`);
    }
  } catch {
    error("Erro ao auto-categorizar");
  }
}

async function handleCategorizeGroup(group: typeof uncategorizedGroups.value[0]) {
  try {
    await categorizeGroup(group);
    success("Grupo categorizado com sucesso");
  } catch {
    error("Erro ao categorizar");
  }
}
</script>

<template>
  <div class="page">
    <!-- Header mobile -->
    <div class="flex items-center justify-between mb-5 lg:hidden">
      <h1 class="text-base font-semibold text-foreground">Gastos</h1>
      <MonthNavigator />
    </div>

    <!-- Painel de categorização -->
    <QuickCategorizePanel
      v-if="hasUncategorized"
      :groups="uncategorizedGroups"
      :categories="categories"
      :loading="categorizing"
      :rules-applying="rulesApplying"
      :uncategorized-count="uncategorizedCount"
      :last-auto-categorized="lastAutoCategorized"
      :last-rules-applied="lastRulesApplied"
      @auto-categorize="handleAutoCategorize"
      @apply-rules="handleApplyRules"
      @categorize-group="handleCategorizeGroup"
    />

    <!-- Skeleton de carregamento -->
    <template v-if="loading && !dashboardData">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Skeleton v-for="i in 4" :key="i" class="h-20" />
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <Skeleton class="h-52" />
        <Skeleton class="h-52" />
      </div>
      <Skeleton class="h-52 mb-4" />
      <Skeleton class="h-52 mb-4" />
    </template>

    <template v-else-if="dashboardData">
      <!-- KPI cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div
          v-for="kpi in kpis"
          :key="kpi.label"
          class="rounded-xl border border-border bg-card p-3"
        >
          <p class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">{{ kpi.label }}</p>
          <p class="text-lg font-bold truncate" :class="kpi.color">{{ kpi.value }}</p>
        </div>
      </div>

      <!-- Donut + Taxa poupança -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <!-- Donut categorias -->
        <div class="rounded-xl border border-border bg-card p-4">
          <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Gastos por categoria</p>
          <VChart v-if="donutOptions" :option="donutOptions" style="height: 180px" autoresize />
          <p v-else class="text-sm text-muted-foreground text-center py-10">Sem dados de categoria</p>
          <!-- Legenda -->
          <div class="mt-3 space-y-1.5 max-h-32 overflow-y-auto pr-1">
            <div
              v-for="(cat, i) in (dashboardData.categoriesBreakdown ?? []).filter(c => Number(c.total) > 0).sort((a,b) => Number(b.total)-Number(a.total)).slice(0,8)"
              :key="cat.categoryId"
              class="flex items-center justify-between gap-2"
            >
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ background: cat.categoryColor ?? PALETTE[i % PALETTE.length] }" />
                <span class="text-xs text-muted-foreground truncate">{{ cat.categoryName ?? "Sem categoria" }}</span>
              </div>
              <span class="text-xs font-medium text-foreground flex-shrink-0">{{ fmt(cat.total) }}</span>
            </div>
          </div>
        </div>

        <!-- Taxa de poupança -->
        <div class="rounded-xl border border-border bg-card p-4 flex flex-col">
          <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Taxa de poupança</p>
          <div class="flex-1 flex flex-col items-center justify-center gap-3">
            <p class="text-5xl font-bold" :style="{ color: savingsColor }">
              {{ savingsRate.toFixed(0) }}<span class="text-2xl">%</span>
            </p>
            <p class="text-xs text-muted-foreground text-center">
              {{ savingsRate >= 30 ? "Excelente! Acima de 30%" : savingsRate >= 15 ? "Bom. Meta ideal: 30%" : "Abaixo de 15% — revise os gastos" }}
            </p>
            <Progress :value="savingsRate" class="w-full mt-1" :color="savingsColor" />
          </div>
          <!-- Livre para gastar -->
          <div class="mt-4 pt-3 border-t border-border">
            <p class="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Livre para gastar</p>
            <p class="text-xl font-bold" :class="dashboardData.freeToSpend >= 0 ? 'text-emerald-400' : 'text-rose-400'">
              {{ fmt(dashboardData.freeToSpend) }}
            </p>
            <p class="text-[10px] text-muted-foreground mt-0.5">
              Comprometimento: {{ dashboardData.commitmentPct.toFixed(0) }}% da receita
            </p>
          </div>
        </div>
      </div>

      <!-- Bar top categorias -->
      <div v-if="barCatsOptions" class="rounded-xl border border-border bg-card p-4 mb-4">
        <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Top categorias</p>
        <VChart :option="barCatsOptions" style="height: 200px" autoresize />
      </div>

      <!-- Bar histórico -->
      <div v-if="barHistOptions" class="rounded-xl border border-border bg-card p-4 mb-4">
        <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Últimos 6 meses</p>
        <VChart :option="barHistOptions" style="height: 200px" autoresize />
      </div>

      <!-- Sem dados de categoria -->
      <div
        v-if="!dashboardData.categoriesBreakdown?.filter(c => Number(c.total) > 0).length"
        class="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm"
      >
        <p class="mb-1 font-medium">Nenhum gasto categorizado ainda</p>
        <p class="text-xs">Categorize as transações acima para ver os gráficos.</p>
      </div>
    </template>
  </div>
</template>
