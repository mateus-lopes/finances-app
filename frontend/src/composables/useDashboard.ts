import { ref, watch } from "vue";
import api from "../services/api";
import { useMonthStore } from "../stores/month";

export interface DashboardPending {
  id: number;
  billId: number;
  name: string;
  type: string;
  amount: number;
  dueDate: string;
  category: { id: number; name: string; color: string | null } | null;
}

export interface DashboardInvestment {
  id: number;
  name: string;
  type: string;
  currentAmount: number;
  targetAmount: number | null;
  showProgress: boolean;
  monthlyAmount: number | null;
  paid: boolean;
  occurrence: { id: number; paid: boolean; amount: string } | null;
}

export interface DashboardCreditCard {
  account: { id: number; name: string; color: string | null };
  month: number;
  year: number;
  amount: number;
  paid: boolean;
  paidAt: string | null;
  invoiceId: number | null;
}

export interface DashboardData {
  month: number;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  invested: number;
  saldo: number;
  savingsRate: number;
  freeToSpend: number;
  commitmentPct: number;
  realBalance: number;
  accountSummary: { liquidTotal: number; investmentTotal: number; openInvoiceTotal: number };
  categoriesBreakdown: {
    categoryId: number;
    categoryName: string | null;
    categoryColor: string | null;
    total: number;
  }[];
  creditCards: DashboardCreditCard[];
  pending: DashboardPending[];
  investments: DashboardInvestment[];
  breakdown: {
    pendingBillExpense: number;
    pendingBillIncome: number;
  };
}

export function useDashboard() {
  const monthStore = useMonthStore();
  const data = ref<DashboardData | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const { data: d } = await api.get<DashboardData>("/dashboard", {
        params: { month: monthStore.month, year: monthStore.year },
      });
      data.value = d;
    } catch {
      error.value = "Erro ao carregar dados";
    } finally {
      loading.value = false;
    }
  }

  watch([() => monthStore.month, () => monthStore.year], load, { immediate: true });

  return { data, loading, error, load };
}
