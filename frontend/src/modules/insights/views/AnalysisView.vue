<script setup lang="ts">
import { computed, ref } from "vue";
import { useAnalysis } from "../composables/useAnalysis";
import { useToast } from "@/shared/composables/useToast";
import MonthNavigator from "@/shared/components/MonthNavigator.vue";
import QuickCategorizePanel from "../components/QuickCategorizePanel.vue";
import AiAnalysisCard from "../components/AiAnalysisCard.vue";
import Progress from "@/shared/ui/Progress.vue";
import Skeleton from "@/shared/ui/Skeleton.vue";

const {
  dashboardData,
  historyData,
  catHistory,
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
} = useAnalysis();

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

const investedRate = computed(() => {
  const d = dashboardData.value;
  if (!d || d.totalIncome === 0) return 0;
  return Math.max(0, Math.min(100, (d.invested / d.totalIncome) * 100));
});

const combinedRate = computed(() => Math.min(100, savingsRate.value + investedRate.value));

// ── SVG line chart (Receitas × Despesas) ──────────────────────────────
const SVG_W = 500;
const SVG_H = 180;
const PAD = { top: 8, bottom: 28, left: 50, right: 12 };

const svgChartData = computed(() => {
  if (!historyData.value.length) return null;
  const innerW = SVG_W - PAD.left - PAD.right;
  const innerH = SVG_H - PAD.top - PAD.bottom;
  const allVals = historyData.value.flatMap(m => [m.income, m.expenses]);
  const maxV = Math.max(...allVals, 1);
  const n = historyData.value.length;
  const px = (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2);
  const py = (v: number) => PAD.top + innerH - (v / maxV) * innerH;
  const ticks = [0, 0.33, 0.66, 1].map(t => ({ y: py(t * maxV), label: fmtK(t * maxV) }));
  const incPts = historyData.value.map((m, i) => ({ x: px(i), y: py(m.income) }));
  const expPts = historyData.value.map((m, i) => ({ x: px(i), y: py(m.expenses) }));
  const bottom = PAD.top + innerH;
  const toStr = (pts: { x: number; y: number }[]) => pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const toArea = (pts: { x: number; y: number }[]) => {
    const last = pts[pts.length - 1];
    return `${toStr(pts)} ${last.x.toFixed(1)},${bottom} ${pts[0].x.toFixed(1)},${bottom}`;
  };
  return {
    ticks, bottom, incPts, expPts,
    incLine: toStr(incPts), expLine: toStr(expPts),
    incArea: toArea(incPts), expArea: toArea(expPts),
    xLabels: historyData.value.map((m, i) => ({ x: px(i), label: MONTH_NAMES[m.month - 1] })),
  };
});

const avgIncome = computed(() =>
  historyData.value.length ? historyData.value.reduce((s, m) => s + m.income, 0) / historyData.value.length : 0
);
const avgExpenses = computed(() =>
  historyData.value.length ? historyData.value.reduce((s, m) => s + m.expenses, 0) / historyData.value.length : 0
);
const totalSaldo6m = computed(() =>
  historyData.value.reduce((s, m) => s + (m.income - m.expenses), 0)
);

// ── Gráfico de categorias ─────────────────────────────────────────────
const CAT_COLORS = ["#a78bfa","#34d399","#fb923c","#60a5fa","#f472b6","#facc15","#f87171","#38bdf8","#4ade80","#c084fc"];
const hiddenCats = ref(new Set<number>());

function catColor(s: { color: string | null }, idx: number): string {
  return s.color ?? CAT_COLORS[idx % CAT_COLORS.length];
}

function toggleCat(id: number) {
  const next = new Set(hiddenCats.value);
  next.has(id) ? next.delete(id) : next.add(id);
  hiddenCats.value = next;
}

const catChartData = computed(() => {
  const hist = catHistory.value;
  if (!hist || !hist.series.length) return null;
  const innerW = SVG_W - PAD.left - PAD.right;
  const innerH = SVG_H - PAD.top - PAD.bottom;
  const visibleSeries = hist.series.filter(s => !hiddenCats.value.has(s.categoryId));
  const maxV = Math.max(...visibleSeries.flatMap(s => s.data), 1);
  const n = hist.months.length;
  const px = (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2);
  const py = (v: number) => PAD.top + innerH - (v / maxV) * innerH;
  const toStr = (pts: { x: number; y: number }[]) => pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return {
    ticks: [0, 0.33, 0.66, 1].map(t => ({ y: py(t * maxV), label: fmtK(t * maxV) })),
    lines: hist.series.map((s, idx) => ({
      categoryId: s.categoryId,
      hidden: hiddenCats.value.has(s.categoryId),
      color: catColor(s, idx),
      pts: s.data.map((v, j) => ({ x: px(j), y: py(v) })),
      line: toStr(s.data.map((v, j) => ({ x: px(j), y: py(v) }))),
    })),
    xLabels: hist.months.map((m, i) => ({ x: px(i), label: MONTH_NAMES[m.month - 1] })),
  };
});

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
      <h1 class="text-base font-semibold text-foreground">Análise</h1>
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

        <!-- Taxa de poupança + investimento -->
        <div class="rounded-xl border border-border bg-card p-4 flex flex-col">
          <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Poupança & Investimento</p>
          <div class="flex-1 flex flex-col items-center justify-center gap-3">
            <!-- Número principal: taxa combinada -->
            <p class="text-5xl font-bold" :style="{ color: savingsColor }">
              {{ combinedRate.toFixed(0) }}<span class="text-2xl">%</span>
            </p>
            <p class="text-xs text-muted-foreground text-center">
              {{ combinedRate >= 30 ? "Excelente! Acima de 30%" : combinedRate >= 15 ? "Bom. Meta ideal: 30%" : "Abaixo de 15% — revise os gastos" }}
            </p>
            <Progress :value="combinedRate" class="w-full mt-1" :color="savingsColor" />
            <!-- Breakdown poupança vs investimento -->
            <div v-if="investedRate > 0" class="w-full flex justify-between text-[11px] text-muted-foreground pt-1">
              <span>Poupança <span class="font-semibold text-foreground">{{ savingsRate.toFixed(0) }}%</span></span>
              <span>Investido <span class="font-semibold text-emerald-400">{{ investedRate.toFixed(0) }}%</span></span>
            </div>
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

      <!-- SVG Line chart: Receitas × Despesas -->
      <div v-if="svgChartData" class="rounded-xl border border-border bg-card p-4 mb-4">
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs font-semibold text-foreground">Receitas × Despesas — tendência</p>
          <div class="flex gap-3">
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-0.5 bg-emerald-400 rounded-full inline-block" />
              <span class="text-[10px] text-muted-foreground">Receitas</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-0.5 bg-rose-400 rounded-full inline-block" />
              <span class="text-[10px] text-muted-foreground">Despesas</span>
            </div>
          </div>
        </div>
        <svg :viewBox="`0 0 ${SVG_W} ${SVG_H}`" class="w-full" style="height:180px">
          <g v-for="tick in svgChartData.ticks" :key="tick.y">
            <line :x1="PAD.left" :y1="tick.y" :x2="SVG_W - PAD.right" :y2="tick.y"
              stroke="currentColor" class="text-border" stroke-width="0.5" opacity="0.4" />
            <text :x="PAD.left - 4" :y="tick.y + 3.5" text-anchor="end" fill="#64748b" font-size="8.5">{{ tick.label }}</text>
          </g>
          <polygon :points="svgChartData.incArea" fill="#34d399" opacity="0.08" />
          <polygon :points="svgChartData.expArea" fill="#f87171" opacity="0.08" />
          <polyline :points="svgChartData.incLine" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          <polyline :points="svgChartData.expLine" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          <circle v-for="p in svgChartData.incPts" :key="`i${p.x}`" :cx="p.x" :cy="p.y" r="3" fill="#34d399" />
          <circle v-for="p in svgChartData.expPts" :key="`e${p.x}`" :cx="p.x" :cy="p.y" r="3" fill="#f87171" />
          <text v-for="l in svgChartData.xLabels" :key="l.x" :x="l.x" :y="SVG_H - 4"
            text-anchor="middle" fill="#64748b" font-size="9">{{ l.label }}</text>
        </svg>
      </div>

      <!-- Gráfico de categorias por linha -->
      <div v-if="catHistory && catHistory.series.length" class="rounded-xl border border-border bg-card p-4 mb-4">
        <p class="text-xs font-semibold text-foreground mb-3">Despesas por categoria — 6 meses</p>
        <div class="flex flex-wrap gap-1.5 mb-3">
          <button
            v-for="(s, idx) in catHistory.series"
            :key="s.categoryId"
            type="button"
            @click="toggleCat(s.categoryId)"
            class="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] border transition-all"
            :class="hiddenCats.has(s.categoryId) ? 'opacity-30 border-border bg-transparent' : 'border-transparent bg-secondary'"
          >
            <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ background: catColor(s, idx) }" />
            {{ s.name }}
          </button>
        </div>
        <svg v-if="catChartData" :viewBox="`0 0 ${SVG_W} ${SVG_H}`" class="w-full" style="height:180px">
          <g v-for="tick in catChartData.ticks" :key="tick.y">
            <line :x1="PAD.left" :y1="tick.y" :x2="SVG_W - PAD.right" :y2="tick.y"
              stroke="currentColor" class="text-border" stroke-width="0.5" opacity="0.4" />
            <text :x="PAD.left - 4" :y="tick.y + 3.5" text-anchor="end" fill="#64748b" font-size="8.5">{{ tick.label }}</text>
          </g>
          <g v-for="line in catChartData.lines" :key="line.categoryId" v-show="!line.hidden">
            <polyline :points="line.line" fill="none" :stroke="line.color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <circle v-for="(p, pi) in line.pts" :key="pi" :cx="p.x" :cy="p.y" r="3" :fill="line.color" />
          </g>
          <text v-for="l in catChartData.xLabels" :key="l.x" :x="l.x" :y="SVG_H - 4"
            text-anchor="middle" fill="#64748b" font-size="9">{{ l.label }}</text>
        </svg>
      </div>

      <!-- KPIs históricos -->
      <div v-if="historyData.length" class="grid grid-cols-3 gap-3 mb-4">
        <div class="rounded-xl border border-border bg-card p-4">
          <p class="text-[10px] text-muted-foreground mb-1">Saldo acumulado</p>
          <p class="text-lg font-bold truncate" :class="totalSaldo6m >= 0 ? 'text-emerald-400' : 'text-rose-400'">{{ fmtK(totalSaldo6m) }}</p>
          <p class="text-[10px] text-muted-foreground mt-0.5">6 meses</p>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <p class="text-[10px] text-muted-foreground mb-1">Média receita</p>
          <p class="text-lg font-bold text-emerald-400 truncate">{{ fmtK(avgIncome) }}</p>
          <p class="text-[10px] text-muted-foreground mt-0.5">por mês</p>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <p class="text-[10px] text-muted-foreground mb-1">Média gastos</p>
          <p class="text-lg font-bold text-rose-400 truncate">{{ fmtK(avgExpenses) }}</p>
          <p class="text-[10px] text-muted-foreground mt-0.5">por mês</p>
        </div>
      </div>

      <!-- Breakdown de categorias com % -->
      <div v-if="dashboardData.categoriesBreakdown?.filter(c => Number(c.total) > 0).length" class="rounded-xl border border-border bg-card overflow-hidden mb-4">
        <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-4 pb-2">Breakdown por categoria</p>
        <div class="divide-y divide-border">
          <div
            v-for="(cat, i) in dashboardData.categoriesBreakdown.filter(c => Number(c.total) > 0).sort((a, b) => Number(b.total) - Number(a.total))"
            :key="cat.categoryId"
            class="flex items-center gap-3 px-4 py-2.5"
          >
            <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ background: cat.categoryColor ?? PALETTE[i % PALETTE.length] }" />
            <span class="flex-1 text-sm text-foreground truncate">{{ cat.categoryName ?? "Sem categoria" }}</span>
            <div class="flex items-center gap-3 flex-shrink-0">
              <span class="text-xs text-muted-foreground w-8 text-right">
                {{ dashboardData.totalExpenses > 0 ? ((Number(cat.total) / dashboardData.totalExpenses) * 100).toFixed(0) : 0 }}%
              </span>
              <span class="text-sm font-medium text-foreground w-20 text-right">{{ fmtK(cat.total) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Análise por IA -->
      <AiAnalysisCard />

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
