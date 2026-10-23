import { parseAmount } from "../../../shared/kernel/money";
import type { BillType } from "./bill";

export interface SectionTotals {
  total: number;
  paid: number;
  pending: number;
}

export interface BillTotals {
  expenses: SectionTotals;
  installments: SectionTotals;
  incomes: SectionTotals;
  transfers: SectionTotals;
}

const emptySection = (): SectionTotals => ({ total: 0, paid: 0, pending: 0 });

/**
 * Totais por seção da tela de recorrentes. Despesa com data de fim é
 * parcelamento; recorrentes sem ocorrência no mês são ignorados.
 */
export function computeBillTotals(
  items: ReadonlyArray<{
    type: BillType;
    endDate: string | null;
    amount: string;
    occurrence: { amount: string; paid: boolean } | null;
  }>,
): BillTotals {
  const totals: BillTotals = {
    expenses: emptySection(),
    installments: emptySection(),
    incomes: emptySection(),
    transfers: emptySection(),
  };

  for (const bill of items) {
    if (!bill.occurrence) continue;
    const amount = parseAmount(bill.occurrence.amount ?? bill.amount);

    const section =
      bill.type === "expense" ? (bill.endDate ? totals.installments : totals.expenses)
      : bill.type === "income" ? totals.incomes
      : totals.transfers;

    section.total += amount;
    if (bill.occurrence.paid) section.paid += amount;
    else section.pending += amount;
  }

  return totals;
}
