import { db } from "../db/client";
import { transactions } from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";

async function run() {
  const months = [1, 2, 3, 4, 5, 6];

  const rows = await db
    .select({ id: transactions.id, month: transactions.month, type: transactions.type, amount: transactions.amount })
    .from(transactions)
    .where(and(
      eq(transactions.userId, 11),
      eq(transactions.year, 2026),
      inArray(transactions.month, months)
    ));

  const byMonth = new Map<number, { count: number; total: number }>();
  for (const r of rows) {
    const cur = byMonth.get(r.month) ?? { count: 0, total: 0 };
    byMonth.set(r.month, { count: cur.count + 1, total: cur.total + parseFloat(r.amount) });
  }

  const names = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
  console.log("=== RESUMO DO QUE SERÁ DELETADO ===");
  let total = 0;
  for (const m of months) {
    const d = byMonth.get(m);
    if (d) {
      console.log(`  ${names[m]}: ${d.count} transações`);
      total += d.count;
    }
  }
  console.log(`\nTotal: ${total} transações`);

  if (!total) { console.log("Nada a deletar."); process.exit(0); }

  const deleted = await db
    .delete(transactions)
    .where(and(
      eq(transactions.userId, 11),
      eq(transactions.year, 2026),
      inArray(transactions.month, months)
    ))
    .returning({ id: transactions.id });

  console.log(`\n✓ ${deleted.length} transações deletadas.`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
