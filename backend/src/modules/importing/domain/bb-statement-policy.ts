import type { StatementEntry } from "./statement-entry";

export type ImportedTransactionType = "income" | "expense" | "transfer";

export interface ClassifiedEntry {
  fitid: string;
  date: string;
  /** Sempre positivo. */
  amount: number;
  type: ImportedTransactionType;
  description: string;
}

// Lançamentos informativos do BB — não são movimentações reais
const INFORMATIONAL = [
  /saldo do dia/i,
  /saldo anterior/i,
];

/** PIX enviado para Mateus ou Mariana = transferência interna entre contas da família. */
function isFamilyTransfer(memo: string): boolean {
  return /pix\s+enviado/i.test(memo) && /(mateus|mariana)/i.test(memo);
}

/** Pagamento de fatura do cartão BB (OUROCARD/OUROVISA). */
export function isCreditCardPayment(memo: string): boolean {
  return /ouro(card|visa)/i.test(memo);
}

/**
 * Regras do extrato do Banco do Brasil. Retorna null para lançamentos que
 * não devem ser importados.
 */
export function classifyEntry(entry: StatementEntry): ClassifiedEntry | null {
  const { memo, amount } = entry;

  if (INFORMATIONAL.some((re) => re.test(memo))) return null;
  // Artefato do BB: OUROCARD/OUROVISA positivo = crédito espelho do débito da fatura
  if (amount >= 0 && isCreditCardPayment(memo)) return null;

  // Pagamento negativo de fatura = transfer da corrente para o cartão
  const type: ImportedTransactionType =
    isCreditCardPayment(memo) || isFamilyTransfer(memo) ? "transfer"
    : amount >= 0 ? "income"
    : "expense";

  return {
    fitid: entry.fitid,
    date: entry.date,
    amount: Math.abs(amount),
    type,
    description: memo,
  };
}
