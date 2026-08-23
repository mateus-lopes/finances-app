import { db } from "../db/client";
import { transactions, categories } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const cats = await db.select().from(categories).where(eq(categories.userId, 11));
  console.log("=== CATEGORIAS ===");
  cats.forEach(c => console.log(`[${c.id}] ${c.name} ${c.color ?? ""}`));

  const txs = await db
    .select({ type: transactions.type, description: transactions.description, amount: transactions.amount, categoryId: transactions.categoryId })
    .from(transactions)
    .where(eq(transactions.userId, 11));

  console.log("\n=== COM CATEGORIA ===");
  txs.filter(t => t.categoryId).forEach(t =>
    console.log(`cat:${t.categoryId} | ${t.type} | ${t.description.slice(0, 60)}`)
  );

  console.log("\n=== SEM CATEGORIA (por frequência) ===");
  const freq = new Map<string, { n: number; type: string; amt: number }>();
  txs.filter(t => !t.categoryId).forEach(t => {
    const cur = freq.get(t.description) ?? { n: 0, type: t.type, amt: parseFloat(t.amount) };
    freq.set(t.description, { ...cur, n: cur.n + 1 });
  });
  [...freq.entries()]
    .sort((a, b) => b[1].n - a[1].n)
    .forEach(([desc, { n, type, amt }]) =>
      console.log(`${n}x | ${type} | R$${amt.toFixed(2)} | ${desc.slice(0, 70)}`)
    );

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
