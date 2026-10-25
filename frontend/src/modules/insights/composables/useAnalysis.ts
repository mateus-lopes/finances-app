import { ref, watch, computed } from "vue";
import { useMonthStore } from "@/shared/stores/month";
import { categoriesApi, transactionsApi, type Category, type Transaction } from "@/modules/ledger";
import { categorizerApi } from "@/modules/categorizer";
import { insightsApi } from "../api";
import type { CategoryHistoryData, DashboardData, MonthHistoryPoint } from "../types";

const HISTORY_MONTHS = 6;

export interface UncategorizedGroup {
  key: string;
  displayName: string;
  count: number;
  total: number;
  transactions: Transaction[];
  selectedCategoryId: string;
}

function normalizeDesc(desc: string): string {
  return desc.replace(/\*.*$/, "").replace(/\s+/g, " ").trim().toUpperCase();
}

/** Agrupa lançamentos sem categoria pela descrição normalizada (maior total primeiro). */
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

/** Estado da tela de Análise: indicadores, históricos e categorização rápida. */
export function useAnalysis() {
  const monthStore = useMonthStore();
  const dashboardData = ref<DashboardData | null>(null);
  const historyData = ref<MonthHistoryPoint[]>([]);
  const catHistory = ref<CategoryHistoryData | null>(null);
  const uncategorizedGroups = ref<UncategorizedGroup[]>([]);
  const categories = ref<Category[]>([]);
  const loading = ref(false);
  const categorizing = ref(false);
  const lastAutoCategorized = ref(0);

  async function load() {
    loading.value = true;
    lastAutoCategorized.value = 0;
    const period = monthStore.period;
    try {
      const [dashboard, history, categoryHistory, uncategorized, loadedCategories] = await Promise.all([
        insightsApi.getDashboard(period),
        insightsApi.getMonthlyHistory(period, HISTORY_MONTHS),
        insightsApi.getCategoryHistory(period, HISTORY_MONTHS),
        transactionsApi.list(period, { uncategorized: true }),
        categories.value.length === 0 ? categoriesApi.list() : Promise.resolve(null),
      ]);
      dashboardData.value = dashboard;
      historyData.value = history;
      catHistory.value = categoryHistory ?? null;
      uncategorizedGroups.value = buildGroups(uncategorized.items ?? []);
      if (loadedCategories) categories.value = loadedCategories;
    } finally {
      loading.value = false;
    }
  }

  async function autoCategorize() {
    categorizing.value = true;
    try {
      lastAutoCategorized.value = (await transactionsApi.autoCategorize(monthStore.period)).categorized;
      await load();
    } finally {
      categorizing.value = false;
    }
  }

  async function categorizeGroup(group: UncategorizedGroup) {
    if (!group.selectedCategoryId) return;
    const categoryId = parseInt(group.selectedCategoryId);
    await Promise.all(group.transactions.map((tx) => transactionsApi.setCategory(tx, categoryId)));
    await load();
  }

  const rulesApplying = ref(false);
  const lastRulesApplied = ref(0);

  async function applyRules() {
    rulesApplying.value = true;
    try {
      lastRulesApplied.value = (await categorizerApi.applyKeywordRules(monthStore.period)).applied;
      await load();
    } finally {
      rulesApplying.value = false;
    }
  }

  const hasUncategorized = computed(() => uncategorizedGroups.value.length > 0);
  const uncategorizedCount = computed(() =>
    uncategorizedGroups.value.reduce((s, g) => s + g.count, 0)
  );

  watch(() => monthStore.period, load, { immediate: true });

  return {
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
    load,
    autoCategorize,
    applyRules,
    categorizeGroup,
  };
}
