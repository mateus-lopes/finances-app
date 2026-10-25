/**
 * API pública do módulo ledger. É o ÚNICO arquivo do ledger que outros
 * módulos podem importar (regra em .dependency-cruiser.cjs).
 */
import type { Period } from "../../shared/kernel/period";
import type { AccountRef, CategoryRef } from "../../shared/kernel/types";
import type { AccountsSummary } from "./domain/account-balances";
import type { CreditCardInvoice } from "./domain/credit-card-invoice";
import type { CategoryAssignment } from "./domain/history-categorization";
import type { TransactionDraft } from "./domain/transaction";

export type { AccountsSummary, CreditCardInvoice, CategoryAssignment, TransactionDraft };

export interface TransactionFingerprint {
  date: string;
  amount: string;
  description: string;
}

export interface LedgerApi {
  getAccountsSummary(userId: number, period: Period): Promise<AccountsSummary>;
  getRealBalance(userId: number): Promise<number>;
  listCreditCardInvoices(userId: number, period: Period): Promise<CreditCardInvoice[]>;

  /** Todas as contas, inclusive inativas — para exibir nomes. */
  listAccountRefs(userId: number): Promise<AccountRef[]>;
  listCategoryRefs(userId: number): Promise<CategoryRef[]>;
  /** Primeiro cartão de crédito ativo (por data de criação), se houver. */
  findPrimaryCreditCardId(userId: number): Promise<number | null>;

  listTransactionFingerprints(userId: number): Promise<TransactionFingerprint[]>;
  recordTransactions(userId: number, drafts: TransactionDraft[]): Promise<number>;

  listUncategorizedTransactions(
    userId: number,
    filter: { month?: number; year?: number },
  ): Promise<Array<{ id: number; description: string }>>;
  assignCategories(userId: number, assignments: CategoryAssignment[]): Promise<void>;
}
