import { parseAmount, sumBy } from "../../../shared/kernel/money";
import type { CategoryRef } from "../../../shared/kernel/types";

/** Indicadores do mês exibidos no dashboard. */
export interface MonthIndicators {
  saldo: number;
  savingsRate: number;
  freeToSpend: number;
  commitmentPct: number;
}

/**
 * saldo = receitas − despesas − investido no mês.
 * Livre para gastar e comprometimento consideram as contas fixas ainda pendentes.
 */
export function monthIndicators(input: {
  totalIncome: number;
  totalExpenses: number;
  invested: number;
  pendingBillExpense: number;
}): MonthIndicators {
  const { totalIncome, totalExpenses, invested, pendingBillExpense } = input;
  const saldo = totalIncome - totalExpenses - invested;
  return {
    saldo,
    savingsRate: totalIncome > 0 ? (saldo / totalIncome) * 100 : 0,
    freeToSpend: totalIncome - pendingBillExpense,
    commitmentPct: totalIncome > 0 ? (pendingBillExpense / totalIncome) * 100 : 0,
  };
}

/** Transferências para contas de investimento contam como valor investido. */
export function investedAmount(
  transfers: ReadonlyArray<{ amount: string; toAccountId: number | null }>,
  investmentAccountIds: ReadonlySet<number>,
): number {
  return sumBy(
    transfers.filter((t) => t.toAccountId != null && investmentAccountIds.has(t.toAccountId)),
    (t) => parseAmount(t.amount),
  );
}

export interface CategoryTotal {
  categoryId: number;
  categoryName: string | null;
  categoryColor: string | null;
  total: number;
}

/** Despesas do mês agrupadas por categoria (despesas sem categoria ficam de fora). */
export function categoryBreakdown(
  expenses: ReadonlyArray<{ categoryId: number | null; amount: string }>,
  categoryById: ReadonlyMap<number, CategoryRef>,
): CategoryTotal[] {
  const totals = new Map<number, number>();
  for (const row of expenses) {
    if (!row.categoryId) continue;
    totals.set(row.categoryId, (totals.get(row.categoryId) ?? 0) + parseAmount(row.amount));
  }
  return [...totals.entries()].map(([id, total]) => {
    const category = categoryById.get(id);
    return { categoryId: id, categoryName: category?.name ?? null, categoryColor: category?.color ?? null, total };
  });
}

export interface OccurrenceWithBill {
  occ: { id: number; amount: string; dueDate: string; paid: boolean };
  bill: { id: number; name: string; type: string; categoryId: number | null; toAccountId: number | null };
}

export interface BillReminder {
  id: number;
  billId: number;
  name: string;
  type: string;
  amount: number;
  dueDate: string;
  category: CategoryRef | null;
}

export function toBillReminder({ occ, bill }: OccurrenceWithBill, categoryById: ReadonlyMap<number, CategoryRef>): BillReminder {
  const category = bill.categoryId ? categoryById.get(bill.categoryId) : null;
  return {
    id: occ.id,
    billId: bill.id,
    name: bill.name,
    type: bill.type,
    amount: parseAmount(occ.amount),
    dueDate: occ.dueDate,
    category: category ? { id: category.id, name: category.name, color: category.color } : null,
  };
}

export function sumOccurrences(items: readonly OccurrenceWithBill[], billType: string): number {
  return sumBy(items.filter(({ bill }) => bill.type === billType), ({ occ }) => parseAmount(occ.amount));
}
