import type { Period } from "../../../../../shared/kernel/period";
import { buildInvoice, type CreditCardInvoice } from "../../../domain/credit-card-invoice";
import type { AccountRepository, InvoiceRepository, TransactionRepository } from "../../ports";

/** Faturas da competência para todos os cartões ativos. */
export class ListCreditCardInvoices {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly transactions: TransactionRepository,
    private readonly invoices: InvoiceRepository,
  ) {}

  async execute(userId: number, period: Period): Promise<CreditCardInvoice[]> {
    const cards = await this.accounts.listActiveCreditCards(userId);
    if (!cards.length) return [];

    const cardIds = cards.map((c) => c.id);
    const [amounts, records] = await Promise.all([
      this.transactions.expensesByAccount(userId, cardIds, period),
      this.invoices.listForAccounts(userId, cardIds, period),
    ]);
    const recordByAccount = new Map(records.map((r) => [r.accountId, r]));

    return cards.map((card) =>
      buildInvoice(card, period, amounts.get(card.id) ?? 0, recordByAccount.get(card.id) ?? null),
    );
  }
}
