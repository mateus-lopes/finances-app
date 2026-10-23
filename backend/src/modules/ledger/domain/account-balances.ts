import { parseAmount, sumBy } from "../../../shared/kernel/money";
import { LIQUID_ACCOUNT_TYPES, type Account } from "./account";

/** Somatório de entradas (toAccount) e saídas (fromAccount) por conta. */
export interface AccountFlows {
  inflows: Map<number, number>;
  outflows: Map<number, number>;
}

export type AccountWithBalance = Account & { balance: number };

export interface AccountsSummary {
  liquidTotal: number;
  investmentTotal: number;
  openInvoiceTotal: number;
}

export function emptySummary(): AccountsSummary {
  return { liquidTotal: 0, investmentTotal: 0, openInvoiceTotal: 0 };
}

/**
 * Saldo = entradas − saídas. Investimentos partem do `currentAmount`
 * informado manualmente; as demais contas partem de zero.
 */
export function applyBalances(accounts: Account[], flows: AccountFlows): AccountWithBalance[] {
  return accounts.map((account) => {
    const net = (flows.inflows.get(account.id) ?? 0) - (flows.outflows.get(account.id) ?? 0);
    const base = account.type === "investment" ? parseAmount(account.currentAmount) : 0;
    return { ...account, balance: base + net };
  });
}

export function summarizeBalances(
  accounts: AccountWithBalance[],
  invoices: ReadonlyArray<{ paid: boolean; amount: number }>,
): AccountsSummary {
  return {
    liquidTotal: sumBy(accounts.filter((a) => LIQUID_ACCOUNT_TYPES.includes(a.type)), (a) => a.balance),
    investmentTotal: sumBy(accounts.filter((a) => a.type === "investment"), (a) => a.balance),
    openInvoiceTotal: sumBy(invoices.filter((inv) => !inv.paid), (inv) => inv.amount),
  };
}
