<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useMonthStore } from "../stores/month";
import Skeleton from "../components/ui/Skeleton.vue";
import MonthNavigator from "../components/MonthNavigator.vue";
import api from "../services/api";

const monthStore = useMonthStore();
const loading = ref(true);

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

interface MonthSnap {
  month: number; year: number;
  totalIncome: number; totalExpenses: number; saldo: number;
  breakdown: { pendingBillExpense: number; pendingBillIncome: number };
  creditCards: { account: { id: number; name: string; color: string | null }; amount: number; paid: boolean }[];
}
interface BillRow {
  id: number; name: string; type: string;
  amount: string; startDate: string; endDate: string | null;
}

const months = ref<MonthSnap[]>([]);
const billList = ref<BillRow[]>([]);

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function fmtK(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1000) return `R$${(v / 1000).toFixed(1)}k`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

async function load() {
  loading.value = true;
  const cur = { month: monthStore.month, year: monthStore.year };

  const params = Array.from({ length: 8 }, (_, i) => {
    let m = cur.month - (7 - i); let y = cur.year;
    while (m <= 0) { m += 12; y--; }
    return { m, y };
  });
  const snaps = await Promise.all(
    params.map(({ m, y }) =>
      api.get("/dashboard", { params: { month: m, year: y } })
        .then(r => r.data as MonthSnap)
        .catch(() => ({ month: m, year: y, totalIncome: 0, totalExpenses: 0, saldo: 0, breakdown: { pendingBillExpense: 0, pendingBillIncome: 0 }, creditCards: [] }))
    )
  );
  months.value = snaps;
  buildCardLines(snaps);

  try {
    const { data } = await api.get("/bills", { params: { month: cur.month, year: cur.year } });
    billList.value = Array.isArray(data) ? data : (data.bills ?? []);
  } catch {}

  loading.value = false;
}

watch([() => monthStore.month, () => monthStore.year], load, { immediate: true });

// ── Mês atual ──────────────────────────────────────────────────────────────
const curSnap   = computed(() => months.value[months.value.length - 1]);

// ── Comprometimento ─────────────────────────────────────────────────────────
const committed     = computed(() => curSnap.value?.breakdown.pendingBillExpense ?? 0);
const freeToSpend   = computed(() => (curSnap.value?.totalIncome ?? 0) - committed.value);
const commitmentPct = computed(() => {
  if (!curSnap.value?.totalIncome) return committed.value > 0 ? 100 : 0;
  return Math.min(100, (committed.value / curSnap.value.totalIncome) * 100);
});
const freeColor = computed(() => {
  if (freeToSpend.value < 0) return "text-rose-400";
  if (commitmentPct.value > 75) return "text-amber-400";
  return "text-emerald-400";
});

// ── Sazonalidade ────────────────────────────────────────────────────────────
const incomeVals  = computed(() => months.value.map(m => m.totalIncome));
const avgIncome   = computed(() => {
  const vals = incomeVals.value.filter(v => v > 0);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
});
const maxIncome   = computed(() => Math.max(...incomeVals.value, 0));
const minIncome   = computed(() => Math.min(...incomeVals.value.filter(v => v > 0), maxIncome.value));
const maxMonthIdx = computed(() => incomeVals.value.indexOf(maxIncome.value));
const minMonthIdx = computed(() => incomeVals.value.indexOf(minIncome.value));
const seasonInsight = computed(() => {
  const vals = incomeVals.value.filter(v => v > 0);
  if (vals.length < 2) return "";
  const diff = maxIncome.value - minIncome.value;
  const maxM = months.value[maxMonthIdx.value];
  const minM = months.value[minMonthIdx.value];
  if (!maxM || !minM) return "";
  return `Sua receita variou ${fmt(diff)} entre ${MONTH_NAMES[minM.month - 1]} e ${MONTH_NAMES[maxM.month - 1]}. Os compromissos fixos não acompanham essa oscilação.`;
});

// ── Horizonte das parcelas ──────────────────────────────────────────────────
const installments = computed(() => {
  const snap = curSnap.value;
  if (!snap) return [];
  const now = new Date(snap.year, snap.month - 1, 1);
  return billList.value
    .filter(b => b.type === "expense" && b.endDate)
    .map(b => {
      const end    = new Date(b.endDate!);
      const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth()) + 1;
      const left   = Math.max(0, months);
      return {
        id: b.id,
        name: b.name,
        amount: parseFloat(b.amount),
        endDate: b.endDate!,
        monthsLeft: left,
        endLabel: `${MONTH_NAMES[end.getMonth()]}/${end.getFullYear().toString().slice(2)}`,
      };
    })
    .filter(i => i.monthsLeft >= 0)
    .sort((a, b) => a.endDate.localeCompare(b.endDate));
});

const releaseNext6m = computed(() =>
  installments.value.filter(i => i.monthsLeft > 0 && i.monthsLeft <= 6).reduce((s, i) => s + i.amount, 0)
);
const totalDebt = computed(() =>
  installments.value.reduce((s, i) => s + i.amount * i.monthsLeft, 0)
);

// ── Faturas dos cartões ─────────────────────────────────────────────────────
type CardLine = { name: string; color: string; values: (number | null)[] };
const cardLinesRaw = ref<CardLine[]>([]);

function buildCardLines(snaps: MonthSnap[]) {
  const map = new Map<string, CardLine>();
  snaps.forEach((snap, idx) => {
    (snap.creditCards ?? []).forEach(cc => {
      const key = cc.account.name;
      if (!map.has(key)) map.set(key, { name: key, color: cc.account.color ?? "#94a3b8", values: new Array(snaps.length).fill(null) });
      map.get(key)!.values[idx] = cc.amount > 0 ? cc.amount : null;
    });
  });
  cardLinesRaw.value = [...map.values()];
}

function sparklinePoints(values: (number | null)[], W = 144, H = 28): string {
  const valid = values.map((v, i) => ({ v, i })).filter(p => p.v != null) as { v: number; i: number }[];
  if (valid.length < 1) return "";
  const allVals = valid.map(p => p.v!);
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const range = max - min || 1;
  const n = values.length;
  const PAD = 3;
  return valid.map(p => {
    const x = (p.i / Math.max(n - 1, 1)) * (W - PAD * 2) + PAD;
    const y = H - PAD - ((p.v! - min) / range) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function lastDot(values: (number | null)[], W = 144, H = 28): { x: number; y: number } | null {
  const allVals = values.filter(v => v != null) as number[];
  if (!allVals.length) return null;
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const range = max - min || 1;
  const n = values.length;
  const PAD = 3;
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] != null) {
      return {
        x: (i / Math.max(n - 1, 1)) * (W - PAD * 2) + PAD,
        y: H - PAD - ((values[i]! - min) / range) * (H - PAD * 2),
      };
    }
  }
  return null;
}

const cardTrend = computed(() =>
  cardLinesRaw.value.map(c => {
    const vals = c.values.filter(v => v != null) as number[];
    const delta = vals.length >= 2 ? vals[vals.length - 1] - vals[vals.length - 2] : 0;
    return {
      name: c.name, color: c.color, values: c.values,
      delta, lastVal: vals[vals.length - 1] ?? 0,
      points: sparklinePoints(c.values),
      dot: lastDot(c.values),
    };
  }).sort((a, b) => b.lastVal - a.lastVal)
);

// ── Insights ─────────────────────────────────────────────────────────────────
type Sentiment = 'good' | 'neutral' | 'bad';
interface Insight { text: string; sentiment: Sentiment; }

function insightBg(s: Sentiment) {
  if (s === 'good') return 'bg-emerald-500/10 border border-emerald-500/25';
  if (s === 'bad')  return 'bg-rose-500/10 border border-rose-500/25';
  return 'bg-blue-500/10 border border-blue-500/25';
}
function insightText(s: Sentiment) {
  if (s === 'good') return 'text-emerald-300';
  if (s === 'bad')  return 'text-rose-300';
  return 'text-blue-300';
}
function insightDot(s: Sentiment) {
  if (s === 'good') return 'bg-emerald-400';
  if (s === 'bad')  return 'bg-rose-400';
  return 'bg-blue-400';
}

const commitInsights = computed((): Insight[] => {
  const list: Insight[] = [];
  const pct = commitmentPct.value;
  if (pct >= 80)      list.push({ text: `${pct.toFixed(0)}% da renda comprometida antes de gastar qualquer coisa.`, sentiment: 'bad' });
  else if (pct >= 55) list.push({ text: `${pct.toFixed(0)}% comprometida — parcelas e fixas pesam bastante.`, sentiment: 'neutral' });
  else                list.push({ text: `${pct.toFixed(0)}% comprometida — boa margem de manobra.`, sentiment: 'good' });
  if (freeToSpend.value < 0)
    list.push({ text: `Comprometimentos superam a receita em ${fmt(Math.abs(freeToSpend.value))}.`, sentiment: 'bad' });
  if (commitmentPct.value >= 55 && committed.value) {
    const pctBill = (committed.value / (curSnap.value?.totalIncome || 1)) * 100;
    if (pctBill >= 30)
      list.push({ text: `Bills e parcelas consomem ${pctBill.toFixed(0)}% da receita — considere renegociar ou antecipar.`, sentiment: 'neutral' });
  }
  return list;
});

const releaseInsights = computed((): Insight[] => {
  if (!installments.value.length) return [{ text: 'Nenhuma parcela ativa no momento.', sentiment: 'good' }];
  const list: Insight[] = [];
  if (releaseNext6m.value > 0)
    list.push({ text: `Em 6 meses você libera ${fmt(releaseNext6m.value)}/mês com o encerramento de parcelas.`, sentiment: 'good' });
  installments.value.filter(i => i.monthsLeft > 0 && i.monthsLeft <= 3).forEach(i => {
    list.push({ text: `${i.name} encerra em ${i.endLabel} — libera ${fmt(i.amount)}/mês.`, sentiment: 'good' });
  });
  if (totalDebt.value > 5000)
    list.push({ text: `Dívida total em parcelas: ${fmtK(totalDebt.value)}.`, sentiment: totalDebt.value > 20000 ? 'bad' : 'neutral' });
  if (!list.length) {
    const soonest = installments.value.find(i => i.monthsLeft > 0);
    list.push(soonest
      ? { text: `A próxima a encerrar é ${soonest.name} em ${soonest.endLabel}.`, sentiment: 'neutral' }
      : { text: 'Todas as parcelas estão quitadas.', sentiment: 'good' });
  }
  return list;
});

const cardInsights = computed((): Insight[] => {
  const sig = cardTrend.value.filter(c => Math.abs(c.delta) > 100);
  if (!sig.length) return [{ text: 'Faturas estáveis em relação ao mês anterior.', sentiment: 'neutral' }];
  return sig.map(c => ({
    text: c.delta > 0
      ? `${c.name} cresceu ${fmtK(c.delta)} em relação ao mês anterior — vale revisar o que entrou.`
      : `${c.name} reduziu ${fmtK(Math.abs(c.delta))} em relação ao mês anterior — boa evolução.`,
    sentiment: (c.delta > 0 ? 'bad' : 'good') as Sentiment,
  }));
});

// ── Charts ──────────────────────────────────────────────────────────────────
const incomeChart = computed(() => ({
  backgroundColor: "transparent",
  grid: { top: 8, bottom: 28, left: 52, right: 16 },
  tooltip: {
    trigger: "axis",
    backgroundColor: "#1c1c2e",
    borderColor: "rgba(255,255,255,0.08)",
    textStyle: { color: "#f8f8f8", fontSize: 11 },
    formatter: (p: any[]) => {
      const snap = months.value[p[0]?.dataIndex];
      if (!snap) return "";
      return `<b>${MONTH_NAMES[snap.month - 1]}/${snap.year}</b><br/>${fmt(p[0].value)}`;
    },
  },
  xAxis: {
    type: "category",
    data: months.value.map(m => MONTH_NAMES[m.month - 1]),
    axisLine: { show: false }, axisTick: { show: false },
    axisLabel: { color: "#64748b", fontSize: 10 },
  },
  yAxis: {
    type: "value",
    axisLabel: { color: "#64748b", fontSize: 10, formatter: (v: number) => fmtK(v) },
    splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
  },
  series: [
    {
      type: "bar",
      barMaxWidth: 40,
      data: incomeVals.value.map((v, i) => ({
        value: v,
        itemStyle: {
          color: i === maxMonthIdx.value ? "#34d399"
            : i === minMonthIdx.value ? "#f87171"
            : "#60a5fa88",
          borderRadius: [4, 4, 0, 0],
        },
      })),
    },
    {
      type: "line",
      data: new Array(months.value.length).fill(avgIncome.value),
      lineStyle: { color: "#facc15", type: "dashed", width: 1.5 },
      symbol: "none",
      silent: true,
      tooltip: { show: false },
    },
  ],
}));

</script>

<template>
  <div class="page space-y-5">

    <div class="lg:hidden mb-1"><MonthNavigator /></div>

    <template v-if="loading">
      <Skeleton class="h-36 w-full rounded-xl" />
      <Skeleton class="h-48 w-full rounded-xl" />
      <Skeleton class="h-64 w-full rounded-xl" />
      <Skeleton class="h-48 w-full rounded-xl" />
    </template>

    <template v-else>

      <!-- ── 1. LIVRE PARA GASTAR ─────────────────────────────────────────── -->
      <div class="rounded-xl border border-border bg-card p-5">
        <p class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">Livre para gastar</p>

        <div class="flex items-end gap-3 mb-4">
          <span class="text-4xl font-bold" :class="freeColor">
            {{ fmt(freeToSpend) }}
          </span>
        </div>

        <!-- Barra de comprometimento -->
        <div class="mb-2">
          <div class="flex justify-between text-[10px] text-muted-foreground mb-1.5">
            <span>Comprometido <b class="text-foreground">{{ commitmentPct.toFixed(0) }}%</b></span>
            <span>Livre <b class="text-foreground">{{ (100 - commitmentPct).toFixed(0) }}%</b></span>
          </div>
          <div class="h-3 rounded-full bg-secondary overflow-hidden">
            <div
              class="h-full rounded-full transition-all"
              :class="commitmentPct >= 80 ? 'bg-rose-400' : commitmentPct >= 55 ? 'bg-amber-400' : 'bg-emerald-400'"
              :style="{ width: `${commitmentPct}%` }"
            />
          </div>
        </div>

        <!-- Breakdown comprometimento -->
        <div class="flex gap-4 mt-4 pt-3 border-t border-border">
          <div>
            <p class="text-[10px] text-muted-foreground">Receita total</p>
            <p class="text-sm font-semibold text-foreground">{{ fmt(curSnap?.totalIncome ?? 0) }}</p>
          </div>
          <div class="w-px bg-border" />
          <div>
            <p class="text-[10px] text-muted-foreground">Bills e parcelas</p>
            <p class="text-sm font-semibold text-rose-400">- {{ fmt(committed) }}</p>
          </div>
          <div class="w-px bg-border" />
          <div>
            <p class="text-[10px] text-muted-foreground">Saldo real</p>
            <p class="text-sm font-semibold" :class="freeColor">{{ fmt(freeToSpend) }}</p>
          </div>
        </div>

        <!-- Insights -->
        <div v-for="(ins, i) in commitInsights" :key="i"
          class="rounded-xl px-3 py-2.5 flex gap-2.5 items-start"
          :class="[insightBg(ins.sentiment), i === 0 ? 'mt-3' : 'mt-2']"
        >
          <span class="w-1.5 h-1.5 rounded-full mt-1 shrink-0" :class="insightDot(ins.sentiment)" />
          <p class="text-[11px] leading-relaxed font-medium" :class="insightText(ins.sentiment)">{{ ins.text }}</p>
        </div>
      </div>

      <!-- ── 2. SAZONALIDADE DA RECEITA ───────────────────────────────────── -->
      <div class="rounded-xl border border-border bg-card p-5">
        <div class="flex items-center justify-between mb-1">
          <p class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Sazonalidade da receita</p>
          <div class="flex gap-3 text-[9px] text-muted-foreground">
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-emerald-400 inline-block"/>Melhor mês</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-rose-400 inline-block"/>Pior mês</span>
            <span class="flex items-center gap-1"><span class="w-5 border-t border-dashed border-yellow-400 inline-block"/>Média</span>
          </div>
        </div>
        <p class="text-xs text-muted-foreground mb-3">Últimos 8 meses — Média: <span class="text-foreground font-medium">{{ fmt(avgIncome) }}</span></p>

        <VChart :option="incomeChart" :autoresize="true" style="height:200px" />

        <div v-if="seasonInsight" class="mt-3 rounded-xl px-3 py-2.5 flex gap-2.5 items-start bg-blue-500/10 border border-blue-500/25">
          <span class="w-1.5 h-1.5 rounded-full mt-1 shrink-0 bg-blue-400" />
          <p class="text-[11px] leading-relaxed font-medium text-blue-300">{{ seasonInsight }}</p>
        </div>
      </div>

      <!-- ── 3. HORIZONTE DAS PARCELAS ────────────────────────────────────── -->
      <div class="rounded-xl border border-border bg-card p-5">
        <p class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Horizonte das parcelas</p>
        <p class="text-xs text-muted-foreground mb-4">Quando cada compromisso se encerra</p>

        <div v-if="!installments.length" class="text-center py-6 text-xs text-muted-foreground">
          Nenhuma parcela ativa encontrada.
        </div>

        <div v-else class="space-y-3">
          <!-- Sumário topo -->
          <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="rounded-lg bg-secondary/60 p-3 text-center">
              <p class="text-[10px] text-muted-foreground">Dívida total restante</p>
              <p class="text-lg font-bold text-foreground">{{ fmtK(totalDebt) }}</p>
            </div>
            <div class="rounded-lg bg-secondary/60 p-3 text-center">
              <p class="text-[10px] text-muted-foreground">Alívio em 6 meses</p>
              <p class="text-lg font-bold text-emerald-400">+{{ fmt(releaseNext6m) }}<span class="text-xs font-normal text-muted-foreground">/mês</span></p>
            </div>
          </div>

          <!-- Lista de parcelas -->
          <div
            v-for="item in installments"
            :key="item.id"
            class="flex items-center gap-3 py-3 border-b border-border/50 last:border-0"
          >
            <!-- Status visual -->
            <div class="flex-shrink-0 w-1.5 h-10 rounded-full"
              :class="item.monthsLeft === 0 ? 'bg-emerald-400' : item.monthsLeft <= 3 ? 'bg-amber-400' : 'bg-rose-400/60'"
            />

            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-foreground truncate">{{ item.name }}</p>
              <p class="text-[11px] text-muted-foreground">
                {{ item.monthsLeft === 0 ? 'Último mês' : `${item.monthsLeft} parcela${item.monthsLeft > 1 ? 's' : ''} restante${item.monthsLeft > 1 ? 's' : ''}` }}
                · termina em <span class="font-medium text-foreground">{{ item.endLabel }}</span>
              </p>
            </div>

            <div class="text-right flex-shrink-0">
              <p class="text-sm font-semibold text-foreground">{{ fmt(item.amount) }}</p>
              <p class="text-[10px] text-muted-foreground">/mês</p>
            </div>
          </div>
        </div>

        <div v-for="(ins, i) in releaseInsights" :key="i"
          class="rounded-xl px-3 py-2.5 flex gap-2.5 items-start"
          :class="[insightBg(ins.sentiment), i === 0 ? 'mt-3' : 'mt-2']"
        >
          <span class="w-1.5 h-1.5 rounded-full mt-1 shrink-0" :class="insightDot(ins.sentiment)" />
          <p class="text-[11px] leading-relaxed font-medium" :class="insightText(ins.sentiment)">{{ ins.text }}</p>
        </div>
      </div>

      <!-- ── 4. EVOLUÇÃO DAS FATURAS ──────────────────────────────────────── -->
      <div class="rounded-xl border border-border bg-card p-5">
        <p class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Evolução dos cartões</p>
        <p class="text-xs text-muted-foreground mb-4">Faturas dos últimos 8 meses</p>

        <div v-if="!cardTrend.length" class="h-24 flex items-center justify-center text-xs text-muted-foreground">
          Sem dados de cartões.
        </div>

        <template v-else>
          <!-- Header: meses alinhados com sparklines -->
          <div class="flex items-center gap-3 mb-3 pb-2 border-b border-border/50">
            <div class="flex-1 min-w-0" />
            <div class="flex items-center justify-between w-36 shrink-0">
              <span class="text-[9px] text-muted-foreground">{{ months.length ? MONTH_NAMES[months[0].month - 1] : '' }}</span>
              <span class="text-[9px] text-muted-foreground/40">—</span>
              <span class="text-[9px] text-muted-foreground">{{ months.length ? MONTH_NAMES[months[months.length - 1].month - 1] : '' }}</span>
            </div>
            <div class="w-24 shrink-0" />
            <div class="w-16 shrink-0" />
          </div>

          <!-- Linha por cartão -->
          <div class="space-y-3">
            <div v-for="card in cardTrend" :key="card.name" class="flex items-center gap-3">
              <!-- Nome -->
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: card.color }" />
                <span class="text-xs text-muted-foreground truncate">{{ card.name }}</span>
              </div>

              <!-- Sparkline SVG -->
              <svg width="144" height="28" class="shrink-0 overflow-visible">
                <polyline
                  v-if="card.points"
                  :points="card.points"
                  fill="none"
                  :stroke="card.color"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  opacity="0.9"
                />
                <circle
                  v-if="card.dot"
                  :cx="card.dot.x"
                  :cy="card.dot.y"
                  r="2.5"
                  :fill="card.color"
                />
              </svg>

              <!-- Valor atual -->
              <span class="text-xs font-semibold text-foreground w-24 text-right shrink-0">{{ fmt(card.lastVal) }}</span>

              <!-- Delta -->
              <span
                class="text-[10px] font-medium tabular-nums w-16 text-right shrink-0"
                :class="card.delta > 0 ? 'text-rose-400' : card.delta < 0 ? 'text-emerald-400' : 'text-muted-foreground'"
              >
                {{ card.delta > 0 ? '▲' : card.delta < 0 ? '▼' : '—' }}
                {{ card.delta !== 0 ? fmtK(Math.abs(card.delta)) : '' }}
              </span>
            </div>
          </div>

          <!-- Insights -->
          <div v-for="(ins, i) in cardInsights" :key="i"
            class="rounded-xl px-3 py-2.5 flex gap-2.5 items-start"
            :class="[insightBg(ins.sentiment), i === 0 ? 'mt-4' : 'mt-2']"
          >
            <span class="w-1.5 h-1.5 rounded-full mt-1 shrink-0" :class="insightDot(ins.sentiment)" />
            <p class="text-[11px] leading-relaxed font-medium" :class="insightText(ins.sentiment)">{{ ins.text }}</p>
          </div>
        </template>
      </div>

    </template>
  </div>
</template>
