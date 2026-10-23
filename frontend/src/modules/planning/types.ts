import type { AccountRef, CategoryRef, TransactionType } from "@/shared/types";

export type BillType = TransactionType;
export type BillFrequency = "monthly" | "weekly" | "biweekly" | "quarterly" | "yearly";

export interface BillOccurrence {
  id: number;
  paid: boolean;
  paidAt: string | null;
  amount: string;
  dueDate: string;
}

export interface Bill {
  id: number;
  name: string;
  type: BillType;
  amount: string;
  frequency: BillFrequency;
  startDate: string;
  endDate: string | null;
  fromAccount: AccountRef | null;
  toAccount: AccountRef | null;
  category: CategoryRef | null;
  occurrence: BillOccurrence | null;
  installmentInfo: { current: number; total: number } | null;
}

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

export interface BillInput {
  name: string;
  type: BillType;
  amount: number;
  frequency: BillFrequency;
  startDate: string;
  /** Preenchido = parcelamento. */
  endDate?: string | null;
  fromAccountId: number | null;
  toAccountId: number | null;
  categoryId?: number | null;
}
