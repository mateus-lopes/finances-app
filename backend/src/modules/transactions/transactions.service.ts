import { eq, and, desc, or, isNull, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { transactions, accounts, categories, TRANSACTION_TYPES } from "../../db/schema";

export const transactionSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  fromAccountId: z.number().int().optional().nullable(),
  toAccountId: z.number().int().optional().nullable(),
  amount: z.coerce.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1),
  notes: z.string().optional().nullable(),
  categoryId: z.number().int().optional().nullable(),
}).refine(
  (d) => d.type !== "transfer" || (d.fromAccountId && d.toAccountId),
  { message: "Transfer requer fromAccountId e toAccountId" }
).refine(
  (d) => d.type !== "income" || !!d.toAccountId,
  { message: "Income requer toAccountId" }
).refine(
  (d) => d.type !== "expense" || !!d.fromAccountId,
  { message: "Expense requer fromAccountId" }
);

function parseMonthYear(date: string) {
  const [year, month] = date.split("-").map(Number);
  return { month, year };
}

export async function listTransactions(
  userId: number,
  month: number,
  year: number,
  filters?: { type?: string; accountId?: number; categoryId?: number; uncategorized?: boolean }
) {
  const rows = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      date: transactions.date,
      month: transactions.month,
      year: transactions.year,
      description: transactions.description,
      notes: transactions.notes,
      reconciled: transactions.reconciled,
      isCarryOver: transactions.isCarryOver,
      billId: transactions.billId,
      createdAt: transactions.createdAt,
      fromAccountId: transactions.fromAccountId,
      toAccountId: transactions.toAccountId,
      categoryId: transactions.categoryId,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.month, month),
        eq(transactions.year, year),
        eq(transactions.isCarryOver, false),
        eq(transactions.isInitialBalance, false),
        filters?.type ? eq(transactions.type, filters.type as "income" | "expense" | "transfer") : undefined,
        filters?.categoryId ? eq(transactions.categoryId, filters.categoryId) : undefined,
        filters?.uncategorized ? isNull(transactions.categoryId) : undefined,
        filters?.accountId
          ? or(eq(transactions.fromAccountId, filters.accountId), eq(transactions.toAccountId, filters.accountId))
          : undefined,
      )
    )
    .orderBy(desc(transactions.date), desc(transactions.createdAt));

  const fromAccountIds = [...new Set(rows.map((r) => r.fromAccountId).filter(Boolean) as number[])];
  const toAccountIds = [...new Set(rows.map((r) => r.toAccountId).filter(Boolean) as number[])];
  const categoryIds = [...new Set(rows.map((r) => r.categoryId).filter(Boolean) as number[])];
  const allAccountIds = [...new Set([...fromAccountIds, ...toAccountIds])];

  const [accts, cats] = await Promise.all([
    allAccountIds.length
      ? db.select({ id: accounts.id, name: accounts.name, type: accounts.type, color: accounts.color }).from(accounts).where(eq(accounts.userId, userId))
      : [],
    categoryIds.length
      ? db.select({ id: categories.id, name: categories.name, color: categories.color }).from(categories).where(eq(categories.userId, userId))
      : [],
  ]);

  const accountMap = new Map(accts.map((a) => [a.id, a]));
  const categoryMap = new Map(cats.map((c) => [c.id, c]));

  const items = rows.map((r) => ({
    ...r,
    fromAccount: r.fromAccountId ? accountMap.get(r.fromAccountId) ?? null : null,
    toAccount: r.toAccountId ? accountMap.get(r.toAccountId) ?? null : null,
    category: r.categoryId ? categoryMap.get(r.categoryId) ?? null : null,
  }));

  let income = 0;
  let expense = 0;
  for (const r of items) {
    const amt = parseFloat(r.amount ?? "0");
    if (r.type === "income") income += amt;
    else if (r.type === "expense") expense += amt;
  }

  const invested = items
    .filter(r => r.type === "transfer" && r.toAccountId && accountMap.get(r.toAccountId)?.type === "investment")
    .reduce((s, r) => s + parseFloat(r.amount ?? "0"), 0);

  return {
    items,
    totals: { income, expense, invested, balance: income - expense - invested },
  };
}

export async function createTransaction(userId: number, data: z.infer<typeof transactionSchema>) {
  const { month, year } = parseMonthYear(data.date);
  const [tx] = await db
    .insert(transactions)
    .values({
      userId,
      type: data.type,
      fromAccountId: data.fromAccountId ?? null,
      toAccountId: data.toAccountId ?? null,
      amount: String(data.amount),
      date: data.date,
      month,
      year,
      description: data.description,
      notes: data.notes ?? null,
      categoryId: data.categoryId ?? null,
    })
    .returning();
  return tx;
}

export async function updateTransaction(userId: number, id: number, data: z.infer<typeof transactionSchema>) {
  const { month, year } = parseMonthYear(data.date);
  const [tx] = await db
    .update(transactions)
    .set({
      type: data.type,
      fromAccountId: data.fromAccountId ?? null,
      toAccountId: data.toAccountId ?? null,
      amount: String(data.amount),
      date: data.date,
      month,
      year,
      description: data.description,
      notes: data.notes ?? null,
      categoryId: data.categoryId ?? null,
    })
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .returning();
  return tx ?? null;
}

export async function deleteTransaction(userId: number, id: number) {
  const [tx] = await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .returning();
  return tx ?? null;
}

function normalizeDesc(desc: string): string {
  return desc.replace(/\*.*$/, "").replace(/\s+/g, " ").trim().toUpperCase();
}

export async function autoCategorizeByHistory(userId: number, month: number, year: number) {
  const [uncategorized, historical] = await Promise.all([
    db
      .select({ id: transactions.id, description: transactions.description })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.month, month),
          eq(transactions.year, year),
          eq(transactions.isCarryOver, false),
          eq(transactions.isInitialBalance, false),
          isNull(transactions.categoryId),
        )
      ),
    db
      .select({ description: transactions.description, categoryId: transactions.categoryId })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          isNotNull(transactions.categoryId),
        )
      ),
  ]);

  if (uncategorized.length === 0) return { categorized: 0, remaining: 0 };

  // Build frequency map: normalizedDesc → Map<categoryId, count>
  const freqMap = new Map<string, Map<number, number>>();
  for (const h of historical) {
    if (!h.categoryId) continue;
    const key = normalizeDesc(h.description);
    if (!freqMap.has(key)) freqMap.set(key, new Map());
    const catMap = freqMap.get(key)!;
    catMap.set(h.categoryId, (catMap.get(h.categoryId) ?? 0) + 1);
  }

  const updates: { id: number; categoryId: number }[] = [];
  for (const tx of uncategorized) {
    const key = normalizeDesc(tx.description);
    const catMap = freqMap.get(key);
    if (!catMap || catMap.size === 0) continue;
    let bestCategoryId = -1;
    let bestCount = 0;
    for (const [catId, count] of catMap) {
      if (count > bestCount) {
        bestCount = count;
        bestCategoryId = catId;
      }
    }
    if (bestCategoryId > 0) updates.push({ id: tx.id, categoryId: bestCategoryId });
  }

  if (updates.length > 0) {
    await Promise.all(
      updates.map((u) =>
        db
          .update(transactions)
          .set({ categoryId: u.categoryId })
          .where(and(eq(transactions.id, u.id), eq(transactions.userId, userId)))
      )
    );
  }

  return { categorized: updates.length, remaining: uncategorized.length - updates.length };
}
