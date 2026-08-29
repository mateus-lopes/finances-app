import { describe, it, expect, beforeEach } from "vitest";
import { authed } from "../helpers/client";
import { createAccount, createBill } from "../helpers/factories";
import { db } from "../../db/client";
import { bills, billOccurrences, transactions, accounts } from "../../db/schema";
import { eq } from "drizzle-orm";
import { getTestUserId } from "../setup";

const M = 8;
const Y = 2026;

beforeEach(async () => {
  await db.delete(billOccurrences).where(eq(billOccurrences.userId, getTestUserId()));
  await db.delete(transactions).where(eq(transactions.userId, getTestUserId()));
  await db.delete(bills).where(eq(bills.userId, getTestUserId()));
  await db.delete(accounts).where(eq(accounts.userId, getTestUserId()));
});

describe("GET /api/bills", () => {
  it("retorna shape {items, totals}", async () => {
    const req = await authed();
    const res = await req.get(`/api/bills?month=${M}&year=${Y}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("items");
    expect(res.body).toHaveProperty("totals");
    expect(res.body.totals).toHaveProperty("expenses");
    expect(res.body.totals).toHaveProperty("installments");
    expect(res.body.totals).toHaveProperty("incomes");
    expect(res.body.totals).toHaveProperty("transfers");
  });

  it("cria ocorrência do mês ao listar", async () => {
    await createBill({ amount: "800.00", startDate: `${Y}-01-01` });

    const req = await authed();
    const res = await req.get(`/api/bills?month=${M}&year=${Y}`);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].occurrence).not.toBeNull();
    expect(res.body.totals.expenses.total).toBe(800);
    expect(res.body.totals.expenses.pending).toBe(800);
    expect(res.body.totals.expenses.paid).toBe(0);
  });

  it("bill com endDate aparece em installments, não expenses", async () => {
    await createBill({
      amount: "150.00",
      startDate: `${Y}-01-01`,
      endDate: `${Y}-12-01`,
    });

    const req = await authed();
    const res = await req.get(`/api/bills?month=${M}&year=${Y}`);

    expect(res.body.totals.expenses.total).toBe(0);
    expect(res.body.totals.installments.total).toBe(150);
  });
});

describe("PATCH /api/bills/occurrences/:id/pay — marcar pago", () => {
  it("cria transação ao marcar como pago", async () => {
    const acc = await createAccount();
    await createBill({ fromAccountId: acc.id, amount: "500.00", startDate: `${Y}-01-01` });

    const req = await authed();
    // Garante ocorrência
    const listRes = await req.get(`/api/bills?month=${M}&year=${Y}`);
    const occ = listRes.body.items[0].occurrence;

    const payRes = await req.patch(`/api/bills/occurrences/${occ.id}/pay`);
    expect(payRes.status).toBe(200);
    expect(payRes.body.paid).toBe(true);
    expect(payRes.body.transactionId).toBeTypeOf("number");

    // Transação criada e visível
    const txRes = await req.get(`/api/transactions?month=${M}&year=${Y}`);
    expect(txRes.body.items.some((tx: { id: number }) => tx.id === payRes.body.transactionId)).toBe(true);
  });

  it("totals refletem pagamento", async () => {
    await createBill({ amount: "300.00", startDate: `${Y}-01-01` });

    const req = await authed();
    const listRes = await req.get(`/api/bills?month=${M}&year=${Y}`);
    const occ = listRes.body.items[0].occurrence;

    await req.patch(`/api/bills/occurrences/${occ.id}/pay`);

    const afterRes = await req.get(`/api/bills?month=${M}&year=${Y}`);
    expect(afterRes.body.totals.expenses.paid).toBe(300);
    expect(afterRes.body.totals.expenses.pending).toBe(0);
  });
});

describe("PATCH /api/bills/occurrences/:id/pay — desmarcar pago", () => {
  it("deleta a transação ao desmarcar", async () => {
    const acc = await createAccount();
    await createBill({ fromAccountId: acc.id, amount: "500.00", startDate: `${Y}-01-01` });

    const req = await authed();
    await req.get(`/api/bills?month=${M}&year=${Y}`);
    const listRes = await req.get(`/api/bills?month=${M}&year=${Y}`);
    const occ = listRes.body.items[0].occurrence;

    // Marcar
    const payRes = await req.patch(`/api/bills/occurrences/${occ.id}/pay`);
    const txId = payRes.body.transactionId;

    // Desmarcar
    const unpayRes = await req.patch(`/api/bills/occurrences/${occ.id}/pay`);
    expect(unpayRes.body.paid).toBe(false);
    expect(unpayRes.body.transactionId).toBeNull();

    // Transação deletada
    const txRes = await req.get(`/api/transactions?month=${M}&year=${Y}`);
    expect(txRes.body.items.every((tx: { id: number }) => tx.id !== txId)).toBe(true);
  });
});
