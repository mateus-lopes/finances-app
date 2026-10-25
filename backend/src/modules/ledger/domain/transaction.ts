import { parseAmount } from "../../../shared/kernel/money";

export const TRANSACTION_TYPES = ["income", "expense", "transfer"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export interface Transaction {
  id: number;
  userId: number;
  type: TransactionType;
  fromAccountId: number | null;
  toAccountId: number | null;
  amount: string;
  date: string;
  month: number;
  year: number;
  description: string;
  notes: string | null;
  categoryId: number | null;
  billId: number | null;
  reconciled: boolean;
  /** Lançamento técnico de saldo transportado — fora das listagens. */
  isCarryOver: boolean;
  /** Saldo inicial de conta real — fora das listagens, mas entra no saldo real. */
  isInitialBalance: boolean;
  createdAt: Date;
}

/**
 * Dados para registrar uma transação. A competência (mês/ano) é sempre
 * derivada de `date` pelo repositório.
 *
 * Origem/destino por tipo: expense sai de `fromAccountId`, income entra em
 * `toAccountId`, transfer usa os dois.
 */
export interface TransactionDraft {
  type: TransactionType;
  fromAccountId: number | null;
  toAccountId: number | null;
  /** Valor positivo como string decimal (ex.: "350" ou "350.00"). */
  amount: string;
  date: string;
  description: string;
  notes?: string | null;
  categoryId: number | null;
  isInitialBalance?: boolean;
}

export interface TransactionTotals {
  income: number;
  expense: number;
  invested: number;
  balance: number;
}

/**
 * Totais do mês. Transferências para contas de investimento contam como
 * "investido" e saem do saldo: balance = income − expense − invested.
 */
export function computeTotals(
  items: ReadonlyArray<{ type: TransactionType; amount: string; toAccountId: number | null }>,
  isInvestmentAccount: (accountId: number) => boolean,
): TransactionTotals {
  let income = 0;
  let expense = 0;
  let invested = 0;
  for (const item of items) {
    const amount = parseAmount(item.amount);
    if (item.type === "income") income += amount;
    else if (item.type === "expense") expense += amount;
    else if (item.toAccountId && isInvestmentAccount(item.toAccountId)) invested += amount;
  }
  return { income, expense, invested, balance: income - expense - invested };
}
