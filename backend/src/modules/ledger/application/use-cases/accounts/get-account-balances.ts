import type { Clock } from "../../../../../shared/kernel/clock";
import { periodOfDate, type Period } from "../../../../../shared/kernel/period";
import {
  applyBalances,
  emptySummary,
  summarizeBalances,
  type AccountWithBalance,
  type AccountsSummary,
} from "../../../domain/account-balances";
import type { AccountRepository, TransactionRepository } from "../../ports";
import type { ListCreditCardInvoices } from "../invoices/list-credit-card-invoices";

/**
 * - `period`: saldo considerando apenas a competência (visão mensal do dashboard).
 * - `all-time`: saldo acumulado de todo o histórico; faturas do mês corrente.
 */
export type BalanceScope = { kind: "period"; period: Period } | { kind: "all-time" };

export interface AccountBalances {
  accounts: AccountWithBalance[];
  summary: AccountsSummary;
}

export class GetAccountBalances {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly transactions: TransactionRepository,
    private readonly listInvoices: ListCreditCardInvoices,
    private readonly clock: Clock,
  ) {}

  async execute(userId: number, scope: BalanceScope): Promise<AccountBalances> {
    const accounts = await this.accounts.listActive(userId);
    if (!accounts.length) return { accounts: [], summary: emptySummary() };

    const flowPeriod = scope.kind === "period" ? scope.period : undefined;
    const invoicePeriod = scope.kind === "period" ? scope.period : periodOfDate(this.clock.now());

    const [flows, invoices] = await Promise.all([
      this.transactions.flowsByAccount(userId, accounts.map((a) => a.id), flowPeriod),
      this.listInvoices.execute(userId, invoicePeriod),
    ]);

    const withBalance = applyBalances(accounts, flows);
    return { accounts: withBalance, summary: summarizeBalances(withBalance, invoices) };
  }
}
