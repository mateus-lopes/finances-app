import type { Period } from "../../../shared/kernel/period";
import type { AccountRef, CategoryRef } from "../../../shared/kernel/types";
import type { TransactionFingerprint } from "../contracts";
import type { Account, AccountData } from "../domain/account";
import type { AccountFlows } from "../domain/account-balances";
import type { Category, CategoryData } from "../domain/category";
import type { InvoiceRecord } from "../domain/credit-card-invoice";
import type { CategoryAssignment } from "../domain/history-categorization";
import type { Transaction, TransactionDraft, TransactionType } from "../domain/transaction";

export interface AccountRepository {
  listActive(userId: number): Promise<Account[]>;
  listActiveCreditCards(userId: number): Promise<Account[]>;
  findActive(userId: number, id: number): Promise<Account | null>;
  listActiveRealIds(userId: number): Promise<number[]>;
  /** Todas as contas (inclusive inativas) — para exibir nomes em históricos. */
  listRefs(userId: number): Promise<AccountRef[]>;
  create(userId: number, data: AccountData): Promise<Account>;
  update(userId: number, id: number, data: AccountData): Promise<Account | null>;
  deactivate(userId: number, id: number): Promise<Account | null>;
}

export interface TransactionFilters {
  type?: string;
  accountId?: number;
  categoryId?: number;
  uncategorized?: boolean;
}

/** Linha da listagem mensal (sem campos técnicos como userId/isInitialBalance). */
export interface TransactionListRow {
  id: number;
  type: TransactionType;
  amount: string;
  date: string;
  month: number;
  year: number;
  description: string;
  notes: string | null;
  reconciled: boolean;
  isCarryOver: boolean;
  billId: number | null;
  createdAt: Date;
  fromAccountId: number | null;
  toAccountId: number | null;
  categoryId: number | null;
}

export interface UncategorizedFilter {
  month?: number;
  year?: number;
  /** Exclui saldo inicial e transporte de saldo. */
  excludeSynthetic?: boolean;
}

export interface TransactionRepository {
  /** Lançamentos visíveis do mês (sem carry-over e saldo inicial), mais recentes primeiro. */
  listVisible(userId: number, period: Period, filters?: TransactionFilters): Promise<TransactionListRow[]>;
  create(userId: number, draft: TransactionDraft): Promise<Transaction>;
  createMany(userId: number, drafts: TransactionDraft[]): Promise<number>;
  update(userId: number, id: number, draft: TransactionDraft): Promise<Transaction | null>;
  delete(userId: number, id: number): Promise<Transaction | null>;

  /** Entradas/saídas por conta; sem `period` considera todo o histórico. */
  flowsByAccount(userId: number, accountIds: number[], period?: Period): Promise<AccountFlows>;
  /** Total de despesas por conta na competência (valor das faturas de cartão). */
  expensesByAccount(userId: number, accountIds: number[], period: Period): Promise<Map<number, number>>;
  /** Entradas − saídas de todo o histórico das contas informadas. */
  netFlow(userId: number, accountIds: number[]): Promise<number>;

  listUncategorized(userId: number, filter: UncategorizedFilter): Promise<Array<{ id: number; description: string }>>;
  listCategorizedHistory(userId: number): Promise<Array<{ description: string; categoryId: number | null }>>;
  assignCategories(userId: number, assignments: CategoryAssignment[]): Promise<void>;
  listFingerprints(userId: number): Promise<TransactionFingerprint[]>;
}

export interface CategoryRepository {
  list(userId: number): Promise<Category[]>;
  listRefs(userId: number): Promise<CategoryRef[]>;
  create(userId: number, data: CategoryData): Promise<Category>;
  update(userId: number, id: number, data: CategoryData): Promise<Category | null>;
  delete(userId: number, id: number): Promise<Category | null>;
}

export interface InvoiceRepository {
  find(userId: number, accountId: number, period: Period): Promise<InvoiceRecord | null>;
  listForAccounts(userId: number, accountIds: number[], period: Period): Promise<InvoiceRecord[]>;
  create(userId: number, accountId: number, period: Period, state: { paid: boolean; paidAt: Date | null }): Promise<InvoiceRecord>;
  updateState(id: number, state: { paid: boolean; paidAt: Date | null }): Promise<InvoiceRecord>;
}
