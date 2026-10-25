import { http } from "@/shared/api/http";
import type { Period } from "@/shared/types";
import type {
  Account,
  AccountInput,
  AccountsSummary,
  Category,
  CategoryInput,
  CreditCardInvoice,
  Transaction,
  TransactionFilters,
  TransactionInput,
  TransactionTotals,
} from "./types";

export const accountsApi = {
  /** Contas ativas com saldo acumulado de todo o histórico. */
  async list(): Promise<{ accounts: Account[]; summary: AccountsSummary }> {
    const { data } = await http.get<{ accounts: Account[]; summary: AccountsSummary }>("/accounts");
    return data;
  },

  async create(input: AccountInput): Promise<Account> {
    const { data } = await http.post<Account>("/accounts", input);
    return data;
  },

  async update(id: number, input: AccountInput): Promise<Account> {
    const { data } = await http.put<Account>(`/accounts/${id}`, input);
    return data;
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/accounts/${id}`);
  },

  async getInvoice(accountId: number, period: Period): Promise<CreditCardInvoice> {
    const { data } = await http.get<CreditCardInvoice>(`/accounts/${accountId}/invoice`, { params: period });
    return data;
  },

  async toggleInvoicePaid(accountId: number, period: Period): Promise<void> {
    await http.patch(`/accounts/${accountId}/invoice/pay`, period);
  },
};

export const transactionsApi = {
  async list(period: Period, filters: TransactionFilters = {}): Promise<{ items: Transaction[]; totals: TransactionTotals }> {
    const params = { ...period, ...filters, uncategorized: filters.uncategorized ? "true" : undefined };
    const { data } = await http.get<{ items: Transaction[]; totals: TransactionTotals }>("/transactions", { params });
    return data;
  },

  async create(input: TransactionInput): Promise<Transaction> {
    const { data } = await http.post<Transaction>("/transactions", input);
    return data;
  },

  async update(id: number, input: TransactionInput): Promise<Transaction> {
    const { data } = await http.put<Transaction>(`/transactions/${id}`, input);
    return data;
  },

  /** A API só aceita atualização completa: reenvia os dados atuais com a nova categoria. */
  setCategory(tx: Transaction, categoryId: number | null): Promise<Transaction> {
    return transactionsApi.update(tx.id, {
      type: tx.type,
      amount: parseFloat(tx.amount),
      date: tx.date,
      description: tx.description,
      notes: tx.notes ?? null,
      fromAccountId: tx.fromAccountId ?? null,
      toAccountId: tx.toAccountId ?? null,
      categoryId,
    });
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/transactions/${id}`);
  },

  /** Repete a categoria mais usada no histórico para a mesma descrição. */
  async autoCategorize(period: Period): Promise<{ categorized: number; remaining: number }> {
    const { data } = await http.post<{ categorized: number; remaining: number }>("/transactions/auto-categorize", period);
    return data;
  },
};

export const categoriesApi = {
  async list(): Promise<Category[]> {
    const { data } = await http.get<Category[]>("/categories");
    return data;
  },

  async create(input: CategoryInput): Promise<Category> {
    const { data } = await http.post<Category>("/categories", input);
    return data;
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/categories/${id}`);
  },
};
