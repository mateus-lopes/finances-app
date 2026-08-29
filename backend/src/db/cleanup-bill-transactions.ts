import { isNotNull, inArray } from "drizzle-orm";
import { db } from "./client";
import { transactions, billOccurrences, creditCardInvoices } from "./schema";

async function cleanup() {
  // 1. Deletar transações geradas por bills (billId preenchido)
  const deletedBill = await db
    .delete(transactions)
    .where(isNotNull(transactions.billId))
    .returning({ id: transactions.id });
  console.log(`Deletadas ${deletedBill.length} transações de bills`);

  // 2. Deletar transações de pagamento de fatura CC
  const invoicesWithPayment = await db
    .select({ txId: creditCardInvoices.paymentTransactionId })
    .from(creditCardInvoices)
    .where(isNotNull(creditCardInvoices.paymentTransactionId));

  const txIds = invoicesWithPayment.map((i) => i.txId!);
  if (txIds.length > 0) {
    await db.delete(transactions).where(inArray(transactions.id, txIds));
    console.log(`Deletadas ${txIds.length} transações de pagamento de fatura`);
  } else {
    console.log("Nenhuma transação de fatura para deletar");
  }

  // 3. Limpar referências órfãs
  await db.update(billOccurrences).set({ transactionId: null });
  await db.update(creditCardInvoices).set({ paymentTransactionId: null });
  console.log("Referências órfãs limpas");

  console.log("Cleanup concluído");
  process.exit(0);
}

cleanup().catch((err) => { console.error(err); process.exit(1); });
