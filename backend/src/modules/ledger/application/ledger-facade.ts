import type { Period } from "../../../shared/kernel/period";
import type { LedgerApi } from "../contracts";
import type { CategoryAssignment } from "../domain/history-categorization";
import type { TransactionDraft } from "../domain/transaction";
import type { AccountRepository, CategoryRepository, TransactionRepository } from "./ports";
import type { GetAccountBalances } from "./use-cases/accounts/get-account-balances";
import type { GetRealBalance } from "./use-cases/accounts/get-real-balance";
import type { ListCreditCardInvoices } from "./use-cases/invoices/list-credit-card-invoices";

/** Implementa o contrato público do ledger consumido pelos demais módulos. */
export class LedgerFacade implements LedgerApi {
  constructor(
    private readonly deps: {
      accounts: AccountRepository;
      transactions: TransactionRepository;
      categories: CategoryRepository;
      getAccountBalances: GetAccountBalances;
      getRealBalance: GetRealBalance;
      listCreditCardInvoices: ListCreditCardInvoices;
    },
  ) {}

  async getAccountsSummary(userId: number, period: Period) {
    const { summary } = await this.deps.getAccountBalances.execute(userId, { kind: "period", period });
    return summary;
  }

  getRealBalance(userId: number) {
    return this.deps.getRealBalance.execute(userId);
  }

  listCreditCardInvoices(userId: number, period: Period) {
    return this.deps.listCreditCardInvoices.execute(userId, period);
  }

  listAccountRefs(userId: number) {
    return this.deps.accounts.listRefs(userId);
  }

  listCategoryRefs(userId: number) {
    return this.deps.categories.listRefs(userId);
  }

  async findPrimaryCreditCardId(userId: number) {
    const [card] = await this.deps.accounts.listActiveCreditCards(userId);
    return card?.id ?? null;
  }

  listTransactionFingerprints(userId: number) {
    return this.deps.transactions.listFingerprints(userId);
  }

  recordTransactions(userId: number, drafts: TransactionDraft[]) {
    return this.deps.transactions.createMany(userId, drafts);
  }

  listUncategorizedTransactions(userId: number, filter: { month?: number; year?: number }) {
    return this.deps.transactions.listUncategorized(userId, filter);
  }

  assignCategories(userId: number, assignments: CategoryAssignment[]) {
    return this.deps.transactions.assignCategories(userId, assignments);
  }
}
