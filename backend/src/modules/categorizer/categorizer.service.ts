import { db } from "../../db/client";
import { transactions, categories } from "../../db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { MATEUS_USER_ID, categorize } from "./categorizer.rules";

export async function applyRules(
  userId: number,
  month?: number,
  year?: number
): Promise<{ applied: number; remaining: number }> {
  if (userId !== MATEUS_USER_ID) return { applied: 0, remaining: 0 };

  const userCats = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.userId, userId));

  const catMap = new Map(userCats.map((c) => [c.name, c.id]));

  const conditions = [
    eq(transactions.userId, userId),
    isNull(transactions.categoryId),
  ];
  if (month !== undefined) conditions.push(eq(transactions.month, month));
  if (year !== undefined) conditions.push(eq(transactions.year, year));

  const uncategorized = await db
    .select({ id: transactions.id, description: transactions.description })
    .from(transactions)
    .where(and(...conditions));

  let applied = 0;

  await Promise.all(
    uncategorized.map(async (tx) => {
      const catName = categorize(tx.description);
      if (!catName) return;
      const catId = catMap.get(catName);
      if (!catId) return;
      await db
        .update(transactions)
        .set({ categoryId: catId })
        .where(and(eq(transactions.id, tx.id), eq(transactions.userId, userId)));
      applied++;
    })
  );

  return { applied, remaining: uncategorized.length - applied };
}
