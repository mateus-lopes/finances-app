import { isoDate, type Period } from "../../../shared/kernel/period";
import type { Bill, NewOccurrence } from "./bill";

const parseLocalDate = (iso: string) => new Date(iso + "T00:00:00");

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

/** Vencimento no mesmo dia do início, limitado ao último dia do mês. */
export function dueDateFor(startDate: string, { month, year }: Period): string {
  const day = parseLocalDate(startDate).getDate();
  return isoDate(year, month, Math.min(day, daysInMonth(year, month)));
}

/**
 * Indica se o recorrente gera ocorrência na competência. Semanal e
 * quinzenal são tratados como uma ocorrência mensal.
 */
export function occursIn(
  bill: Pick<Bill, "startDate" | "endDate" | "frequency">,
  { month, year }: Period,
): boolean {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const start = parseLocalDate(bill.startDate);
  const end = bill.endDate ? parseLocalDate(bill.endDate) : null;

  if (start > lastDay) return false;
  if (end && end < firstDay) return false;

  switch (bill.frequency) {
    case "monthly":
    case "weekly":
    case "biweekly":
      return true;
    case "yearly":
      return start.getMonth() === month - 1;
    case "quarterly": {
      const monthsDiff = (year - start.getFullYear()) * 12 + (month - 1 - start.getMonth());
      return monthsDiff >= 0 && monthsDiff % 3 === 0;
    }
    default:
      return false;
  }
}

/** Ocorrências que faltam criar na competência (ignora recorrentes que já têm uma). */
export function missingOccurrences(
  bills: readonly Bill[],
  existingBillIds: ReadonlySet<number>,
  userId: number,
  period: Period,
): NewOccurrence[] {
  return bills
    .filter((bill) => !existingBillIds.has(bill.id) && occursIn(bill, period))
    .map((bill) => ({
      billId: bill.id,
      userId,
      dueDate: dueDateFor(bill.startDate, period),
      month: period.month,
      year: period.year,
      amount: bill.amount,
    }));
}

/** "Parcela X de Y" para recorrentes com data de fim. */
export function installmentInfo(
  startDate: string,
  endDate: string | null,
  { month, year }: Period,
): { current: number; total: number } | null {
  if (!endDate) return null;
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const total = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  const current = (year - start.getFullYear()) * 12 + (month - 1 - start.getMonth()) + 1;
  return { current: Math.max(1, Math.min(current, total)), total };
}
