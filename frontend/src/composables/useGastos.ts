import { ref, watch, computed } from "vue";
import api from "../services/api";
import { useMonthStore } from "../stores/month";
import type { DashboardData } from "./useDashboard";

export interface Transaction {
  id: number;
  type: string;
  amount: string;
  date: string;
  description: string;
  notes: string | null;
  fromAccountId: number | null;
  toAccountId: number | null;
  categoryId: number | null;
}

export interface UncategorizedGroup {
  key: string;
  displayName: string;
  count: number;
  total: number;
  transactions: Transaction[];
  selectedCategoryId: string;
}

export interface Category {
  id: number;
  name: string;
  color: string | null;
}

export interface MonthHistoryPoint {
  month: number;
  year: number;
  income: number;
  expenses: number;
  saldo: number;
  savingsRate: number;
}

function normalizeDesc(desc: string): string {
  return desc.replace(/\*.*$/, "").replace(/\s+/g, " ").trim().toUpperCase();
}

function buildGroups(items: Transaction[]): UncategorizedGroup[] {
  const map = new Map<string, Transaction[]>();
  for (const tx of items) {
    const key = normalizeDesc(tx.description);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }
  const groups: UncategorizedGroup[] = [];
  for (const [key, txs] of map) {
    groups.push({
      key,
      displayName: key,
      count: txs.length,
      total: txs.reduce((s, t) => s + parseFloat(t.amount), 0),
      transactions: txs,
      selectedCategoryId: "",
    });
  }
  return groups.sort((a, b) => b.total - a.total);
}

export function useGastos() {
  const monthStore = useMonthStore();
  const dashboardData = ref<DashboardData | null>(null);
  const historyData = ref<MonthHistoryPoint[]>([]);
  const uncategorizedGroups = ref<UncategorizedGroup[]>([]);
  const categories = ref<Category[]>([]);
  const loading = ref(false);
  const categorizing = ref(false);
  const lastAutoCategorized = ref(0);

  async function load() {
    loading.value = true;
    lastAutoCategorized.value = 0;
    try {
      const [dashRes, histRes, uncatRes, catsRes] = await Promise.all([
        api.get<DashboardData>("/dashboard", {
          params: { month: monthStore.month, year: monthStore.year },
        }),
        api.get<MonthHistoryPoint[]>("/dashboard/history", {
          params: { endMonth: monthStore.month, endYear: monthStore.year, months: 6 },
        }),
        api.get<{ items: Transaction[] }>("/transactions", {
          params: { month: monthStore.month, year: monthStore.year, uncategorized: "true" },
        }),
        categories.value.length === 0 ? api.get<Category[]>("/categories") : Promise.resolve(null),
      ]);
      dashboardData.value = dashRes.data;
      historyData.value = Array.isArray(histRes.data) ? histRes.data : [];
      uncategorizedGroups.value = buildGroups(uncatRes.data.items ?? []);
      if (catsRes) categories.value = catsRes.data;
    } finally {
      loading.value = false;
    }
  }

  async function autoCategorize() {
    categorizing.value = true;
    try {
      const { data } = await api.post<{ categorized: number; remaining: number }>(
        "/transactions/auto-categorize",
        { month: monthStore.month, year: monthStore.year }
      );
      lastAutoCategorized.value = data.categorized;
      await load();
    } finally {
      categorizing.value = false;
    }
  }

  async function categorizeGroup(group: UncategorizedGroup) {
    if (!group.selectedCategoryId) return;
    const categoryId = parseInt(group.selectedCategoryId);
    await Promise.all(
      group.transactions.map((tx) =>
        api.put(`/transactions/${tx.id}`, {
          type: tx.type,
          amount: parseFloat(tx.amount),
          date: tx.date,
          description: tx.description,
          notes: tx.notes ?? null,
          fromAccountId: tx.fromAccountId ?? null,
          toAccountId: tx.toAccountId ?? null,
          categoryId,
        })
      )
    );
    await load();
  }

  const rulesApplying = ref(false);
  const lastRulesApplied = ref(0);

  async function applyRules() {
    rulesApplying.value = true;
    try {
      const { data } = await api.post<{ applied: number; remaining: number }>(
        "/categorizer/apply",
        { month: monthStore.month, year: monthStore.year }
      );
      lastRulesApplied.value = data.applied;
      await load();
    } finally {
      rulesApplying.value = false;
    }
  }

  const hasUncategorized = computed(() => uncategorizedGroups.value.length > 0);
  const uncategorizedCount = computed(() =>
    uncategorizedGroups.value.reduce((s, g) => s + g.count, 0)
  );

  watch([() => monthStore.month, () => monthStore.year], load, { immediate: true });

  return {
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
    load,
    autoCategorize,
    applyRules,
    categorizeGroup,
  };
}
