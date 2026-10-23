import type { AccountRef, CategoryRef, TransactionType } from "@/shared/types";

export type AccountType = "checking" | "savings" | "cash" | "credit_card" | "investment";

export const LIQUID_ACCOUNT_TYPES: readonly AccountType[] = ["checking", "savings", "cash"];

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  color: string | null;
  active: boolean;
  targetAmount: string | null;
  currentAmount: string;
  showProgress: boolean;
  isReal: boolean;
  balance: number;
  createdAt: string;
}

export interface AccountsSummary {
  liquidTotal: number;
  investmentTotal: number;
  openInvoiceTotal: number;
}

export interface AccountInput {
  name: string;
  type: AccountType;
  color?: string;
  /** Omitido = sem meta. */
  targetAmount?: number;
  currentAmount?: number;
  showProgress?: boolean;
  isReal?: boolean;
  /** Só aplicado na criação de contas reais. */
  initialBalance?: number;
}

export interface CreditCardInvoice {
  account: { id: number; name: string; color: string | null };
  month: number;
  year: number;
  amount: number;
  paid: boolean;
  paidAt: string | null;
  invoiceId: number | null;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: string;
  date: string;
  month: number;
  year: number;
  description: string;
  notes: string | null;
  fromAccountId: number | null;
  toAccountId: number | null;
  categoryId: number | null;
  fromAccount: AccountRef | null;
  toAccount: AccountRef | null;
  category: CategoryRef | null;
}

export interface TransactionTotals {
  income: number;
  expense: number;
  invested: number;
  balance: number;
}

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  notes?: string | null;
  fromAccountId: number | null;
  toAccountId: number | null;
  categoryId?: number | null;
}

export interface TransactionFilters {
  type?: TransactionType;
  accountId?: number;
  categoryId?: number;
  uncategorized?: boolean;
}

export type Category = CategoryRef;

export interface CategoryInput {
  name: string;
  color?: string;
}
