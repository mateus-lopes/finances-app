import type { Period } from "../../../shared/kernel/period";

/** Resumo de um mês no histórico. Aqui saldo = receitas − despesas (sem investimentos). */
export interface MonthStats {
  month: number;
  year: number;
  income: number;
  expenses: number;
  saldo: number;
  savingsRate: number;
}

export function monthStats(period: Period, income: number, expenses: number): MonthStats {
  const saldo = income - expenses;
  return { ...period, income, expenses, saldo, savingsRate: income > 0 ? (saldo / income) * 100 : 0 };
}
