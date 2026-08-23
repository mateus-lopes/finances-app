<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useDashboard } from "../composables/useDashboard";
import { useMonthStore } from "../stores/month";
import { useToast } from "../composables/useToast";
import MonthNavigator from "../components/MonthNavigator.vue";
import Skeleton from "../components/ui/Skeleton.vue";
import Badge from "../components/ui/Badge.vue";
import Progress from "../components/ui/Progress.vue";
import api from "../services/api";

const { data, loading, load } = useDashboard();
const hoverCat = ref<number | null>(null);
const { success, error } = useToast();
const monthStore = useMonthStore();

function fmt(value: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
}

function fmtShort(v: number | string | null | undefined) {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1000) return `R$${(n / 1000).toFixed(1)}k`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
}

const pct = (current: number | null, goal: number | null) =>
  goal && goal > 0 ? Math.min(100, ((current ?? 0) / goal) * 100) : 0;

async function toggleInvoice(accountId: number, month: number, year: number) {
  try {
    await api.patch(`/accounts/${accountId}/invoice/pay`, { month, year });
    await load();
  } catch { error("Erro ao atualizar fatura"); }
}

async function toggleOccurrence(occurrenceId: number) {
  try {
    await api.patch(`/bills/occurrences/${occurrenceId}/pay`);
    await load();
  } catch { error("Erro ao atualizar pendência"); }
}

// ── Financeiro: 6 meses históricos ──────────────────────────────────────
const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const SVG_W = 500;
const SVG_H = 180;
const PAD = { top: 8, bottom: 28, left: 50, right: 12 };

interface MonthData { month: number; year: number; income: number; expenses: number; saldo: number; }
const histMonths = ref<MonthData[]>([]);

async function loadHistorical() {
  try {
    const { data } = await api.get<MonthData[]>("/dashboard/history", {
      params: { endMonth: monthStore.month, endYear: monthStore.year, months: 6 },
    });
    histMonths.value = data;
  } catch { histMonths.value = []; }
}

watch([() => monthStore.month, () => monthStore.year], loadHistorical, { immediate: true });

const savingsRate = computed(() => data.value?.savingsRate ?? 0);
const totalSaldo6m = computed(() => histMonths.value.reduce((s, m) => s + m.saldo, 0));
const avgIncome = computed(() => histMonths.value.length ? histMonths.value.reduce((s, m) => s + m.income, 0) / histMonths.value.length : 0);
const avgExpense = computed(() => histMonths.value.length ? histMonths.value.reduce((s, m) => s + m.expenses, 0) / histMonths.value.length : 0);

const chartData = computed(() => {
  if (!histMonths.value.length) return null;
  const innerW = SVG_W - PAD.left - PAD.right;
  const innerH = SVG_H - PAD.top - PAD.bottom;
  const allVals = histMonths.value.flatMap(m => [m.income, m.expenses]);
  const maxV = Math.max(...allVals, 1);
  const n = histMonths.value.length;
  const px = (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2);
  const py = (v: number) => PAD.top + innerH - (v / maxV) * innerH;
  const ticks = [0, 0.33, 0.66, 1].map(t => ({ y: py(t * maxV), label: fmtShort(t * maxV) }));
  const incPts = histMonths.value.map((m, i) => ({ x: px(i), y: py(m.income) }));
  const expPts = histMonths.value.map((m, i) => ({ x: px(i), y: py(m.expenses) }));
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
    xLabels: histMonths.value.map((m, i) => ({ x: px(i), label: MONTH_NAMES[m.month - 1] })),
  };
});

const pieOptions = computed(() => {
  if (!data.value?.categoriesBreakdown.length) return null;
  const cats = data.value.categoriesBreakdown.filter(c => Number(c.total) > 0);
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
        itemStyle: { color: c.categoryColor ?? ["#a78bfa","#34d399","#fb923c","#60a5fa","#f472b6","#facc15"][i % 6] },
      })),
    }],
  };
});
</script>

<template>
  <div class="page">
    <!-- Header -->
    <div class="flex items-center justify-between mb-5 lg:hidden">
      <MonthNavigator />
    </div>

    <!-- Skeleton -->
    <template v-if="loading">
      <Skeleton class="h-36 w-full mb-3" />
      <Skeleton class="h-20 w-full mb-3" />
      <Skeleton class="h-20 w-full mb-3" />
    </template>

    <template v-else-if="data">
      <!-- Saldo card -->
      <div class="rounded-2xl p-5 mb-4 relative overflow-hidden"
        :class="data.saldo >= 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20'">
        <div class="absolute inset-0 opacity-5"
          :style="{ background: data.saldo >= 0 ? 'radial-gradient(circle at 80% 50%, #10b981 0%, transparent 60%)' : 'radial-gradient(circle at 80% 50%, #ef4444 0%, transparent 60%)' }" />
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Saldo do mês</p>
        <p class="text-3xl font-bold mb-3" :class="data.saldo >= 0 ? 'text-emerald-400' : 'text-rose-400'">
          {{ fmt(data.saldo) }}
        </p>
        <div class="flex gap-4 flex-wrap">
          <div>
            <p class="text-xs text-muted-foreground">Receitas</p>
            <p class="text-sm font-semibold text-emerald-400">+{{ fmtShort(data.totalIncome) }}</p>
          </div>
          <div class="w-px bg-white/10" />
          <div>
            <p class="text-xs text-muted-foreground">Despesas</p>
            <p class="text-sm font-semibold text-rose-400">-{{ fmtShort(data.totalExpenses) }}</p>
          </div>
          <template v-if="(data.invested ?? 0) > 0">
            <div class="w-px bg-white/10" />
            <div>
              <p class="text-xs text-muted-foreground">Investido</p>
              <p class="text-sm font-semibold text-violet-400">↗{{ fmtShort(data.invested) }}</p>
            </div>
          </template>
        </div>
      </div>

      <!-- Saldo Real -->
      <div class="rounded-2xl p-4 mb-4 border border-border bg-card flex items-center justify-between">
        <div>
          <p class="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Saldo Real</p>
          <p class="text-lg font-bold" :class="data.realBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'">
            {{ fmt(data.realBalance) }}
          </p>
          <p class="text-xs text-muted-foreground mt-0.5">Acumulado de todas as contas reais</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="text-muted-foreground">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
      </div>

      <!-- Pendências -->
      <template v-if="data.pending.length > 0">
        <p class="section-label mb-2">Pendências ({{ data.pending.length }})</p>
        <div class="rounded-xl border border-border bg-card overflow-hidden mb-4">
          <button
            v-for="(item, i) in data.pending"
            :key="item.id"
            type="button"
            @click="toggleOccurrence(item.id)"
            class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 active:bg-secondary transition-colors group"
            :class="{ 'border-t border-border': i > 0 }"
          >
            <div class="flex-shrink-0 w-8 h-8 rounded-full border-2 border-border group-hover:border-primary/50 transition-colors flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-muted-foreground">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5">
                <span
                  v-if="item.category"
                  class="w-2 h-2 rounded-full flex-shrink-0 cursor-default"
                  :style="{ background: item.category.color ?? '#8b5cf6' }"
                  @mouseenter="hoverCat = item.id"
                  @mouseleave="hoverCat = null"
                  @click.stop="hoverCat = hoverCat === item.id ? null : item.id"
                />
                <p class="text-sm font-medium text-foreground truncate">{{ item.name }}</p>
              </div>
              <p class="text-xs text-muted-foreground mt-0.5">vence {{ new Date(item.dueDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) }}</p>
              <p v-if="item.category && hoverCat === item.id" class="text-xs mt-0.5 uppercase tracking-wide" :style="{ color: item.category.color ?? '#8b5cf6' }">{{ item.category.name }}</p>
            </div>
            <span class="text-sm font-semibold" :class="item.type === 'income' ? 'text-emerald-400' : 'text-rose-400'">
              {{ item.type === 'income' ? '+' : '-' }}{{ fmtShort(item.amount) }}
            </span>
          </button>
        </div>
      </template>

      <!-- Faturas de cartão -->
      <template v-if="data.creditCards.length > 0">
        <p class="section-label mb-2">Faturas de cartão</p>
        <div class="rounded-xl border border-border bg-card overflow-hidden mb-4">
          <button
            v-for="(card, i) in data.creditCards"
            :key="card.account.id"
            type="button"
            @click="toggleInvoice(card.account.id, card.month, card.year)"
            class="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 active:bg-secondary transition-colors"
            :class="{ 'border-t border-border': i > 0 }"
          >
            <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              :style="{ background: (card.account.color ?? '#8b5cf6') + '20', color: card.account.color ?? '#8b5cf6' }">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0 text-left">
              <p class="text-sm font-medium text-foreground">{{ card.account.name }}</p>
              <p class="text-xs text-muted-foreground">Fatura do mês</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-rose-400">{{ fmtShort(card.amount) }}</span>
              <Badge :variant="card.paid ? 'success' : 'warning'">{{ card.paid ? 'Pago' : 'Aberto' }}</Badge>
            </div>
          </button>
        </div>
      </template>

      <!-- Investimentos -->
      <template v-if="data.investments.length > 0">
        <p class="section-label mb-2">Investimentos</p>
        <div class="rounded-xl border border-border bg-card overflow-hidden mb-4">
          <div
            v-for="(inv, i) in data.investments"
            :key="inv.id"
            class="px-4 py-3"
            :class="{ 'border-t border-border': i > 0 }"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-foreground">{{ inv.name }}</p>
                <p class="text-xs text-muted-foreground">{{ fmt(inv.currentAmount) }} acumulado</p>
              </div>
              <div class="flex items-center gap-2">
                <span v-if="inv.monthlyAmount" class="text-xs text-muted-foreground">+{{ fmtShort(inv.monthlyAmount) }}/mês</span>
                <Badge :variant="inv.paid ? 'success' : 'muted'">{{ inv.paid ? 'Aportado' : 'Pendente' }}</Badge>
              </div>
            </div>
            <template v-if="inv.showProgress && inv.targetAmount">
              <Progress :value="pct(inv.currentAmount, inv.targetAmount)" class="mt-3" color="#34d399" />
              <div class="flex justify-between mt-1">
                <span class="text-xs text-muted-foreground">{{ fmtShort(inv.currentAmount) }}</span>
                <span class="text-xs text-muted-foreground">Meta: {{ fmtShort(inv.targetAmount) }}</span>
              </div>
            </template>
          </div>
        </div>
      </template>

      <!-- Gastos por categoria + gráfico -->
      <template v-if="data.categoriesBreakdown.filter(c => Number(c.total) > 0).length > 0">
        <p class="section-label mb-2">Gastos por categoria</p>
        <div class="rounded-xl border border-border bg-card overflow-hidden mb-4">
          <div v-if="pieOptions" class="px-4 pt-4">
            <VChart :option="pieOptions" :autoresize="true" style="height:180px" />
          </div>
          <div class="divide-y divide-border">
            <div
              v-for="cat in data.categoriesBreakdown.filter(c => Number(c.total) > 0).slice(0, 6)"
              :key="cat.categoryId"
              class="flex items-center gap-3 px-4 py-2.5"
            >
              <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ background: cat.categoryColor ?? '#8b5cf6' }" />
              <span class="flex-1 text-sm text-foreground">{{ cat.categoryName ?? "Sem categoria" }}</span>
              <span class="text-sm font-medium text-muted-foreground">{{ fmtShort(cat.total) }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- Financeiro -->
      <template v-if="histMonths.length">
        <p class="section-label mb-2">Financeiro</p>

        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="rounded-xl border border-border bg-card p-4">
            <p class="text-xs text-muted-foreground mb-1">Taxa de poupança</p>
            <p class="text-2xl font-bold" :class="savingsRate >= 20 ? 'text-emerald-400' : savingsRate > 0 ? 'text-amber-400' : 'text-rose-400'">
              {{ savingsRate.toFixed(0) }}%
            </p>
            <p class="text-xs text-muted-foreground mt-0.5">do mês atual</p>
          </div>
          <div class="rounded-xl border border-border bg-card p-4">
            <p class="text-xs text-muted-foreground mb-1">Saldo acumulado</p>
            <p class="text-2xl font-bold" :class="totalSaldo6m >= 0 ? 'text-emerald-400' : 'text-rose-400'">{{ fmtShort(totalSaldo6m) }}</p>
            <p class="text-xs text-muted-foreground mt-0.5">últimos 6 meses</p>
          </div>
          <div class="rounded-xl border border-border bg-card p-4">
            <p class="text-xs text-muted-foreground mb-1">Média de receita</p>
            <p class="text-xl font-bold text-emerald-400">{{ fmtShort(avgIncome) }}</p>
            <p class="text-xs text-muted-foreground mt-0.5">por mês</p>
          </div>
          <div class="rounded-xl border border-border bg-card p-4">
            <p class="text-xs text-muted-foreground mb-1">Média de gastos</p>
            <p class="text-xl font-bold text-rose-400">{{ fmtShort(avgExpense) }}</p>
            <p class="text-xs text-muted-foreground mt-0.5">por mês</p>
          </div>
        </div>

        <div class="rounded-xl border border-border bg-card p-4 mb-4">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs font-semibold text-foreground">Receitas × Despesas — 6 meses</p>
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
          <svg v-if="chartData" :viewBox="`0 0 ${SVG_W} ${SVG_H}`" class="w-full" style="height:180px">
            <g v-for="tick in chartData.ticks" :key="tick.y">
              <line :x1="PAD.left" :y1="tick.y" :x2="SVG_W - PAD.right" :y2="tick.y"
                stroke="currentColor" class="text-border" stroke-width="0.5" opacity="0.4" />
              <text :x="PAD.left - 4" :y="tick.y + 3.5" text-anchor="end" fill="#64748b" font-size="8.5">{{ tick.label }}</text>
            </g>
            <polygon :points="chartData.incArea" fill="#34d399" opacity="0.08" />
            <polygon :points="chartData.expArea" fill="#f87171" opacity="0.08" />
            <polyline :points="chartData.incLine" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <polyline :points="chartData.expLine" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <circle v-for="p in chartData.incPts" :key="`i${p.x}`" :cx="p.x" :cy="p.y" r="3" fill="#34d399" />
            <circle v-for="p in chartData.expPts" :key="`e${p.x}`" :cx="p.x" :cy="p.y" r="3" fill="#f87171" />
            <text v-for="l in chartData.xLabels" :key="l.x" :x="l.x" :y="SVG_H - 4"
              text-anchor="middle" fill="#64748b" font-size="9">{{ l.label }}</text>
          </svg>
          <div v-else class="h-40 flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>
        </div>
      </template>

      <!-- Estado vazio -->
      <div v-if="!data.pending.length && !data.creditCards.length && !data.investments.length && !data.categoriesBreakdown.filter(c => Number(c.total) > 0).length"
        class="flex flex-col items-center justify-center py-16 text-center">
        <div class="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted-foreground">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
          </svg>
        </div>
        <p class="text-sm text-muted-foreground">Nenhuma atividade neste mês</p>
        <p class="text-xs text-muted-foreground/60 mt-1">Use o + para lançar sua primeira transação</p>
      </div>
    </template>
  </div>
</template>
