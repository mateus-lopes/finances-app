import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { bills, billOccurrences, accounts, categories, BILL_TYPES, BILL_FREQUENCIES } from "../../db/schema";

export const billSchema = z.object({
  name: z.string().min(1).max(150),
  type: z.enum(BILL_TYPES),
  fromAccountId: z.number().int().optional().nullable(),
  toAccountId: z.number().int().optional().nullable(),
  amount: z.coerce.number().positive(),
  categoryId: z.number().int().optional().nullable(),
  frequency: z.enum(BILL_FREQUENCIES).default("monthly"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes: z.string().optional().nullable(),
});

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function calcDueDate(startDate: string, month: number, year: number): string {
  const start = new Date(startDate + "T00:00:00");
  const day = start.getDate();
  const maxDay = daysInMonth(year, month);
  const dueDay = Math.min(day, maxDay);
  return `${year}-${String(month).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;
}

function billOccursInMonth(bill: { startDate: string; endDate: string | null; frequency: string }, month: number, year: number): boolean {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const start = new Date(bill.startDate + "T00:00:00");
  const end = bill.endDate ? new Date(bill.endDate + "T00:00:00") : null;

  if (start > lastDay) return false;
  if (end && end < firstDay) return false;

  if (bill.frequency === "monthly") return true;

  if (bill.frequency === "yearly") {
    return start.getMonth() === month - 1;
  }

  if (bill.frequency === "quarterly") {
    const monthsDiff = (year - start.getFullYear()) * 12 + (month - 1 - start.getMonth());
    return monthsDiff >= 0 && monthsDiff % 3 === 0;
  }

  if (bill.frequency === "biweekly" || bill.frequency === "weekly") {
    return true;
  }

  return false;
}

export async function ensureOccurrencesForMonth(userId: number, month: number, year: number) {
  const activeBills = await db
    .select()
    .from(bills)
    .where(and(eq(bills.userId, userId), eq(bills.active, true)));

  if (!activeBills.length) return;

  const existingOccurrences = await db
    .select({ billId: billOccurrences.billId })
    .from(billOccurrences)
    .where(
      and(
        eq(billOccurrences.userId, userId),
        eq(billOccurrences.month, month),
        eq(billOccurrences.year, year)
      )
    );

  const existingBillIds = new Set(existingOccurrences.map((o) => o.billId));

  const toInsert = activeBills
    .filter((bill) => !existingBillIds.has(bill.id) && billOccursInMonth(bill, month, year))
    .map((bill) => ({
      billId: bill.id,
      userId,
      dueDate: calcDueDate(bill.startDate, month, year),
      month,
      year,
      amount: bill.amount,
      paid: false,
      paidAt: null,
      transactionId: null,
    }));

  if (toInsert.length) {
    await db.insert(billOccurrences).values(toInsert);
  }
}

export async function listBillsForMonth(userId: number, month: number, year: number) {
  await ensureOccurrencesForMonth(userId, month, year);

  const rows = await db
    .select({
      bill: bills,
      occurrence: billOccurrences,
    })
    .from(bills)
    .leftJoin(
      billOccurrences,
      and(
        eq(billOccurrences.billId, bills.id),
        eq(billOccurrences.month, month),
        eq(billOccurrences.year, year)
      )
    )
    .where(and(eq(bills.userId, userId), eq(bills.active, true)))
    .orderBy(bills.createdAt);

  const accountIds = [...new Set(
    rows.flatMap((r) => [r.bill.fromAccountId, r.bill.toAccountId]).filter(Boolean) as number[]
  )];
  const categoryIds = [...new Set(rows.map((r) => r.bill.categoryId).filter(Boolean) as number[])];

  const [accts, cats] = await Promise.all([
    accountIds.length
      ? db.select({ id: accounts.id, name: accounts.name, type: accounts.type, color: accounts.color }).from(accounts).where(eq(accounts.userId, userId))
      : [],
    categoryIds.length
      ? db.select({ id: categories.id, name: categories.name, color: categories.color }).from(categories).where(eq(categories.userId, userId))
      : [],
  ]);

  const accountMap = new Map(accts.map((a) => [a.id, a]));
  const categoryMap = new Map(cats.map((c) => [c.id, c]));

  const items = rows.map((r) => ({
    ...r.bill,
    occurrence: r.occurrence ?? null,
    fromAccount: r.bill.fromAccountId ? accountMap.get(r.bill.fromAccountId) ?? null : null,
    toAccount: r.bill.toAccountId ? accountMap.get(r.bill.toAccountId) ?? null : null,
    category: r.bill.categoryId ? categoryMap.get(r.bill.categoryId) ?? null : null,
    installmentInfo: calcInstallmentInfo(r.bill.startDate, r.bill.endDate, month, year),
  }));

  const totals = calcBillTotals(items);
  return { items, totals };
}

function calcInstallmentInfo(
  startDate: string,
  endDate: string | null,
  month: number,
  year: number,
): { current: number; total: number } | null {
  if (!endDate) return null;
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const total =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    1;
  const current =
    (year - start.getFullYear()) * 12 + (month - 1 - start.getMonth()) + 1;
  return { current: Math.max(1, Math.min(current, total)), total };
}

type SectionTotals = { total: number; paid: number; pending: number };

function calcBillTotals(
  items: Array<{ type: string; endDate: string | null; amount: string; occurrence: { amount: string; paid: boolean } | null }>,
) {
  const empty = (): SectionTotals => ({ total: 0, paid: 0, pending: 0 });
  const result = {
    expenses: empty(),
    installments: empty(),
    incomes: empty(),
    transfers: empty(),
  };

  for (const bill of items) {
    if (!bill.occurrence) continue; // skip bills not active this month
    const amount = parseFloat(bill.occurrence.amount ?? bill.amount ?? "0");
    const isPaid = bill.occurrence.paid;

    let section: SectionTotals;
    if (bill.type === "expense" && !bill.endDate) section = result.expenses;
    else if (bill.type === "expense" && bill.endDate) section = result.installments;
    else if (bill.type === "income") section = result.incomes;
    else section = result.transfers;

    section.total += amount;
    if (isPaid) section.paid += amount;
    else section.pending += amount;
  }

  return result;
}

export async function createBill(userId: number, data: z.infer<typeof billSchema>) {
  const [bill] = await db
    .insert(bills)
    .values({
      userId,
      name: data.name,
      type: data.type,
      fromAccountId: data.fromAccountId ?? null,
      toAccountId: data.toAccountId ?? null,
      amount: String(data.amount),
      categoryId: data.categoryId ?? null,
      frequency: data.frequency,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      notes: data.notes ?? null,
    })
    .returning();
  return bill;
}

export async function updateBill(userId: number, id: number, data: z.infer<typeof billSchema>) {
  const [bill] = await db
    .update(bills)
    .set({
      name: data.name,
      type: data.type,
      fromAccountId: data.fromAccountId ?? null,
      toAccountId: data.toAccountId ?? null,
      amount: String(data.amount),
      categoryId: data.categoryId ?? null,
      frequency: data.frequency,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      notes: data.notes ?? null,
    })
    .where(and(eq(bills.id, id), eq(bills.userId, userId)))
    .returning();
  return bill ?? null;
}

export async function deleteBill(userId: number, id: number) {
  const [bill] = await db
    .update(bills)
    .set({ active: false })
    .where(and(eq(bills.id, id), eq(bills.userId, userId)))
    .returning();
  return bill ?? null;
}

export async function toggleOccurrencePaid(userId: number, occurrenceId: number) {
  const [occ] = await db
    .select()
    .from(billOccurrences)
    .where(and(eq(billOccurrences.id, occurrenceId), eq(billOccurrences.userId, userId)));

  if (!occ) return null;

  const nowPaid = !occ.paid;
  const [updated] = await db
    .update(billOccurrences)
    .set({ paid: nowPaid, paidAt: nowPaid ? new Date() : null })
    .where(eq(billOccurrences.id, occurrenceId))
    .returning();

  return updated;
}
