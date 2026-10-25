import type { Period } from "../../../shared/kernel/period";

/** Registro persistido de fatura (existe só depois do primeiro "marcar paga"). */
export interface InvoiceRecord {
  id: number;
  accountId: number;
  userId: number;
  month: number;
  year: number;
  paid: boolean;
  paidAt: Date | null;
  paymentTransactionId: number | null;
  createdAt: Date;
}

/** Fatura do mês: valor = soma das despesas lançadas no cartão naquela competência. */
export interface CreditCardInvoice {
  account: { id: number; name: string; color: string | null };
  month: number;
  year: number;
  amount: number;
  paid: boolean;
  paidAt: Date | null;
  invoiceId: number | null;
}

export function buildInvoice(
  card: { id: number; name: string; color: string | null },
  period: Period,
  amount: number,
  record: InvoiceRecord | null,
): CreditCardInvoice {
  return {
    account: { id: card.id, name: card.name, color: card.color },
    month: period.month,
    year: period.year,
    amount,
    paid: record?.paid ?? false,
    paidAt: record?.paidAt ?? null,
    invoiceId: record?.id ?? null,
  };
}

/** Alterna o estado de pagamento; fatura sem registro é considerada em aberto. */
export function togglePaidState(record: InvoiceRecord | null, now: Date): { paid: boolean; paidAt: Date | null } {
  const paid = !record?.paid;
  return { paid, paidAt: paid ? now : null };
}
