import type { CategoryRef, Period } from "@/shared/types";

export interface BillReminder {
  id: number;
  billId: number;
  name: string;
  type: string;
  amount: number;
  dueDate: string;
  category: CategoryRef | null;
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

export interface CategoryTotal {
  categoryId: number;
  categoryName: string | null;
  categoryColor: string | null;
  total: number;
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
  breakdown: { pendingBillExpense: number; pendingBillIncome: number };
  categoriesBreakdown: CategoryTotal[];
  creditCards: DashboardCreditCard[];
  pending: BillReminder[];
  investments: DashboardInvestment[];
  /** Recorrentes já pagos no mês (exceto aportes). */
  confirmed: BillReminder[];
}

export interface MonthHistoryPoint {
  month: number;
  year: number;
  income: number;
  expenses: number;
  saldo: number;
  savingsRate: number;
}

export interface CategorySeries {
  categoryId: number;
  name: string;
  color: string | null;
  data: number[];
}

export interface CategoryHistoryData {
  months: Period[];
  series: CategorySeries[];
}

export interface AiAnalysisResult {
  sentimento: "positivo" | "neutro" | "negativo";
  avaliacao: string;
  destaques: { tipo: "positivo" | "atencao" | "negativo"; texto: string }[];
  sugestao: string;
}
