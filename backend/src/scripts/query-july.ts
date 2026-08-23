import { db } from "../db/client";
import { transactions } from "../db/schema";
import { eq, and } from "drizzle-orm";

async function run() {
  const rows = await db
    .select({ date: transactions.date, description: transactions.description, amount: transactions.amount })
    .from(transactions)
    .where(and(
      eq(transactions.userId, 11),
      eq(transactions.month, 7),
      eq(transactions.year, 2026),
      eq(transactions.type, "income")
    ));

  const total = rows.reduce((s, r) => s + parseFloat(r.amount), 0);
  console.log("Total receitas julho/2026: R$" + total.toFixed(2));
  console.log("Quantidade: " + rows.length);
  console.log("");
  rows.forEach(r => console.log(r.date + " | " + r.description + " | R$" + parseFloat(r.amount).toFixed(2)));
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
