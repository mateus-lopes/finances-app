/** Lançamento bruto lido do extrato, antes de qualquer regra de negócio. */
export interface StatementEntry {
  fitid: string;
  /** Data ISO `YYYY-MM-DD`. */
  date: string;
  /** Valor com sinal: positivo = crédito, negativo = débito. */
  amount: number;
  memo: string;
}
