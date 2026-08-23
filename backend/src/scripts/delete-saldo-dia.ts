import { db } from "../db/client";
import { transactions } from "../db/schema";
import { eq, and, ilike } from "drizzle-orm";

async function run() {
  const rows = await db
    .select({ id: transactions.id, date: transactions.date, amount: transactions.amount })
    .from(transactions)
    .where(and(
      eq(transactions.userId, 11),
      ilike(transactions.description, "%saldo do dia%")
    ));

  console.log(`Encontrados: ${rows.length} registros "Saldo do dia"`);
  rows.forEach(r => console.log(`  [${r.id}] ${r.date} | R$${parseFloat(r.amount).toFixed(2)}`));

  if (!rows.length) { process.exit(0); }

  const deleted = await db
    .delete(transactions)
    .where(and(
      eq(transactions.userId, 11),
      ilike(transactions.description, "%saldo do dia%")
    ))
    .returning({ id: transactions.id });

  console.log(`\n✓ ${deleted.length} registros deletados.`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
