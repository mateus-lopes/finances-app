import { firstDayOf, type Period } from "../../../shared/kernel/period";
import type { TransactionDraft } from "./transaction";

/** Conta real criada com saldo inicial gera uma receita técnica no 1º dia do mês corrente. */
export function initialBalanceDraft(accountId: number, amount: number, current: Period): TransactionDraft {
  return {
    type: "income",
    fromAccountId: null,
    toAccountId: accountId,
    amount: amount.toFixed(2),
    date: firstDayOf(current),
    description: "Saldo inicial",
    categoryId: null,
    isInitialBalance: true,
  };
}
