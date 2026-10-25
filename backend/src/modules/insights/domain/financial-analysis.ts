import type { Period } from "../../../shared/kernel/period";
import type { MonthStats } from "./month-stats";

/** Dados agregados enviados ao consultor financeiro (IA). */
export interface FinancialSnapshot {
  period: Period;
  totalIncome: number;
  totalExpenses: number;
  saldo: number;
  invested: number;
  savingsRate: number;
  commitmentPct: number;
  freeToSpend: number;
  categories: Array<{ name: string; total: number }>;
  history: MonthStats[];
}

export interface FinancialAnalysis {
  sentimento: "positivo" | "neutro" | "negativo";
  avaliacao: string;
  destaques: { tipo: "positivo" | "atencao" | "negativo"; texto: string }[];
  sugestao: string;
}
