import { describe, it, expect, beforeEach } from "vitest";
import { authed } from "../helpers/client";
import { createAccount, createTransaction } from "../helpers/factories";
import { db } from "../../db/client";
import { transactions } from "../../db/schema";
import { eq } from "drizzle-orm";
import { getTestUserId } from "../setup";

const M = 8;
const Y = 2026;
const PAD = `${Y}-${String(M).padStart(2, "0")}`;

// Limpa transações do usuário de teste antes de cada caso
beforeEach(async () => {
  await db.delete(transactions).where(eq(transactions.userId, getTestUserId()));
});

describe("GET /api/transactions", () => {
  it("retorna shape {items, totals}", async () => {
    const req = await authed();
    const res = await req.get(`/api/transactions?month=${M}&year=${Y}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("items");
    expect(res.body).toHaveProperty("totals");
    expect(res.body.totals).toMatchObject({ income: expect.any(Number), expense: expect.any(Number), balance: expect.any(Number) });
  });

  it("totaliza receitas e despesas corretamente", async () => {
    const acc = await createAccount();
    await createTransaction({ month: M, year: Y, type: "income", amount: "1500.00", toAccountId: acc.id });
    await createTransaction({ month: M, year: Y, type: "expense", amount: "400.00", fromAccountId: acc.id });

    const req = await authed();
    const res = await req.get(`/api/transactions?month=${M}&year=${Y}`);

    expect(res.body.totals.income).toBe(1500);
    expect(res.body.totals.expense).toBe(400);
    expect(res.body.totals.balance).toBe(1100);
    expect(res.body.items).toHaveLength(2);
  });

  it("exclui isCarryOver e isInitialBalance da listagem", async () => {
    const acc = await createAccount();
    await createTransaction({ month: M, year: Y, type: "income", amount: "999.00", toAccountId: acc.id, isCarryOver: true });
    await createTransaction({ month: M, year: Y, type: "income", amount: "500.00", toAccountId: acc.id, isInitialBalance: true });
    await createTransaction({ month: M, year: Y, type: "expense", amount: "50.00", fromAccountId: acc.id });

    const req = await authed();
    const res = await req.get(`/api/transactions?month=${M}&year=${Y}`);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].type).toBe("expense");
    expect(res.body.totals.income).toBe(0);
    expect(res.body.totals.expense).toBe(50);
  });

  it("não retorna transações de outros meses", async () => {
    const acc = await createAccount();
    await createTransaction({ month: 7, year: Y, type: "expense", amount: "100.00", fromAccountId: acc.id });
    await createTransaction({ month: M, year: Y, type: "expense", amount: "200.00", fromAccountId: acc.id });

    const req = await authed();
    const res = await req.get(`/api/transactions?month=${M}&year=${Y}`);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].amount).toBe("200.00");
  });
});

describe("POST /api/transactions", () => {
  it("cria transação e aparece na listagem com totais corretos", async () => {
    const acc = await createAccount();
    const req = await authed();

    const res = await req.post("/api/transactions").send({
      type: "expense",
      amount: 350,
      date: `${PAD}-10`,
      description: "Mercado",
      fromAccountId: acc.id,
    });

    expect(res.status).toBe(201);
    expect(res.body.description).toBe("Mercado");

    const listRes = await req.get(`/api/transactions?month=${M}&year=${Y}`);
    expect(listRes.body.items).toHaveLength(1);
    expect(listRes.body.totals.expense).toBe(350);
  });

  it("retorna 400 para transfer sem fromAccountId", async () => {
    const req = await authed();
    const res = await req.post("/api/transactions").send({
      type: "transfer",
      amount: 100,
      date: `${PAD}-10`,
      description: "Transferência sem origem",
      toAccountId: 999,
    });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/transactions/:id", () => {
  it("remove a transação e atualiza totais", async () => {
    const acc = await createAccount();
    const tx = await createTransaction({ month: M, year: Y, fromAccountId: acc.id, amount: "250.00" });

    const req = await authed();
    const delRes = await req.delete(`/api/transactions/${tx.id}`);
    expect(delRes.status).toBe(200);

    const listRes = await req.get(`/api/transactions?month=${M}&year=${Y}`);
    expect(listRes.body.items).toHaveLength(0);
    expect(listRes.body.totals.expense).toBe(0);
  });

  it("retorna 404 para ID inexistente", async () => {
    const req = await authed();
    const res = await req.delete("/api/transactions/999999");
    expect(res.status).toBe(404);
  });
});
