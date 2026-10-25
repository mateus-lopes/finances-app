import type { Period } from "../../../../../shared/kernel/period";
import { buildInvoice, type CreditCardInvoice } from "../../../domain/credit-card-invoice";
import type { AccountRepository, InvoiceRepository, TransactionRepository } from "../../ports";

export class GetCreditCardInvoice {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly transactions: TransactionRepository,
    private readonly invoices: InvoiceRepository,
  ) {}

  /** Retorna null se a conta não existir, estiver inativa ou não for cartão. */
  async execute(userId: number, accountId: number, period: Period): Promise<CreditCardInvoice | null> {
    const account = await this.accounts.findActive(userId, accountId);
    if (!account || account.type !== "credit_card") return null;

    const [amounts, record] = await Promise.all([
      this.transactions.expensesByAccount(userId, [accountId], period),
      this.invoices.find(userId, accountId, period),
    ]);

    return buildInvoice(account, period, amounts.get(accountId) ?? 0, record);
  }
}
