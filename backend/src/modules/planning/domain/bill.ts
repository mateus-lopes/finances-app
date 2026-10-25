export const BILL_TYPES = ["income", "expense", "transfer"] as const;
export type BillType = (typeof BILL_TYPES)[number];

export const BILL_FREQUENCIES = ["monthly", "weekly", "biweekly", "quarterly", "yearly"] as const;
export type BillFrequency = (typeof BILL_FREQUENCIES)[number];

/**
 * Lançamento recorrente planejado (conta fixa, parcela, salário...).
 * É apenas um lembrete: o OFX importado é a fonte de verdade das transações,
 * então marcar uma ocorrência como paga NÃO gera transação.
 */
export interface Bill {
  id: number;
  userId: number;
  name: string;
  type: BillType;
  fromAccountId: number | null;
  toAccountId: number | null;
  amount: string;
  categoryId: number | null;
  frequency: BillFrequency;
  startDate: string;
  /** Preenchido = parcelamento com fim definido. */
  endDate: string | null;
  notes: string | null;
  active: boolean;
  createdAt: Date;
}

export interface BillData {
  name: string;
  type: BillType;
  fromAccountId: number | null;
  toAccountId: number | null;
  amount: string;
  categoryId: number | null;
  frequency: BillFrequency;
  startDate: string;
  endDate: string | null;
  notes: string | null;
}

/** Instância mensal de um recorrente, com seu estado de pagamento. */
export interface BillOccurrence {
  id: number;
  billId: number;
  userId: number;
  dueDate: string;
  month: number;
  year: number;
  amount: string;
  paid: boolean;
  paidAt: Date | null;
  transactionId: number | null;
  createdAt: Date;
}

export type NewOccurrence = Pick<BillOccurrence, "billId" | "userId" | "dueDate" | "month" | "year" | "amount">;

export function togglePaid(occurrence: BillOccurrence, now: Date): { paid: boolean; paidAt: Date | null } {
  const paid = !occurrence.paid;
  return { paid, paidAt: paid ? now : null };
}
