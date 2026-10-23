import type { Period } from "../../../shared/kernel/period";
import type { CategoryRef } from "../../../shared/kernel/types";
import type { OccurrenceWithBill } from "../domain/dashboard";
import type { FinancialAnalysis, FinancialSnapshot } from "../domain/financial-analysis";

export interface InvestmentAccountRow {
  id: number;
  name: string;
  type: string;
  currentAmount: string;
  targetAmount: string | null;
  showProgress: boolean;
}

/** Ocorrência completa (exposta como `occurrence` nos investimentos do dashboard). */
export interface OccurrenceRow {
  id: number;
  billId: number;
  userId: number;
  dueDate: string;
  month: number;
  year: number;
  amount: string;
  paid: boolean;
  paidAt: Date | null;
  transactionId: number | null;
  createdAt: Date;
}

export interface BillOccurrenceRow extends OccurrenceWithBill {
  occ: OccurrenceRow;
}

/**
 * Consultas de leitura do dashboard. Insights é o lado de leitura do
 * monólito e pode consultar tabelas de qualquer módulo diretamente.
 */
export interface InsightsReadModel {
  monthSums(userId: number, period: Period): Promise<{ income: number; expenses: number }>;
  expenseRows(userId: number, period: Period): Promise<Array<{ categoryId: number | null; amount: string }>>;
  transferRows(userId: number, period: Period): Promise<Array<{ amount: string; toAccountId: number | null }>>;
  /** Ocorrências da competência de recorrentes ativos. */
  activeBillOccurrences(userId: number, period: Period): Promise<BillOccurrenceRow[]>;
  /** Ocorrências da competência de recorrentes do tipo transferência (aportes). */
  transferBillOccurrences(userId: number, period: Period): Promise<BillOccurrenceRow[]>;
  activeInvestmentAccounts(userId: number): Promise<InvestmentAccountRow[]>;
  categoriesByIds(userId: number, ids: number[]): Promise<CategoryRef[]>;
  expenseTotalsByCategory(userId: number, period: Period): Promise<Array<{ categoryId: number | null; total: number }>>;
}

/** Gera a análise em linguagem natural (implementado por um LLM). */
export interface FinancialAdvisor {
  analyze(snapshot: FinancialSnapshot): Promise<FinancialAnalysis>;
}
