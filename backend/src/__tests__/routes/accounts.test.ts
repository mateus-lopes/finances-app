import { describe, it, expect, beforeEach } from "vitest";
import { authed } from "../helpers/client";
import { createAccount, createTransaction } from "../helpers/factories";
import { db } from "../../db/client";
import { accounts, transactions, creditCardInvoices } from "../../db/schema";
import { eq } from "drizzle-orm";
import { getTestUserId } from "../setup";

const M = 8;
const Y = 2026;

beforeEach(async () => {
  await db.delete(creditCardInvoices).where(eq(creditCardInvoices.userId, getTestUserId()));
  await db.delete(transactions).where(eq(transactions.userId, getTestUserId()));
  await db.delete(accounts).where(eq(accounts.userId, getTestUserId()));
});

describe("GET /api/accounts", () => {
  it("retorna shape {accounts, summary}", async () => {
    const req = await authed();
    const res = await req.get(`/api/accounts?month=${M}&year=${Y}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("accounts");
    expect(res.body).toHaveProperty("summary");
    expect(res.body.summary).toMatchObject({
      liquidTotal: expect.any(Number),
      investmentTotal: expect.any(Number),
      openInvoiceTotal: expect.any(Number),
    });
  });

  it("summary.liquidTotal reflete transações do mês", async () => {
    const acc = await createAccount({ type: "checking" });
    await createTransaction({ month: M, year: Y, type: "income", amount: "2000.00", toAccountId: acc.id });
    await createTransaction({ month: M, year: Y, type: "expense", amount: "600.00", fromAccountId: acc.id });

    const req = await authed();
    const res = await req.get(`/api/accounts?month=${M}&year=${Y}`);

    expect(res.body.summary.liquidTotal).toBe(1400);
  });

  it("balance por conta é calculado corretamente", async () => {
    const acc = await createAccount({ name: "Minha Corrente", type: "checking" });
    await createTransaction({ month: M, year: Y, type: "income", amount: "1000.00", toAccountId: acc.id });
    await createTransaction({ month: M, year: Y, type: "expense", amount: "300.00", fromAccountId: acc.id });

    const req = await authed();
    const res = await req.get(`/api/accounts?month=${M}&year=${Y}`);
    const found = res.body.accounts.find((a: { id: number }) => a.id === acc.id);

    expect(found.balance).toBe(700);
  });
});

describe("POST /api/accounts", () => {
  it("cria conta simples", async () => {
    const req = await authed();
    const res = await req.post("/api/accounts").send({ name: "Nova Conta", type: "savings" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Nova Conta");
  });

  it("conta isReal com saldo inicial cria transação de saldo inicial", async () => {
    const req = await authed();
    const res = await req.post("/api/accounts").send({
      name: "BB Corrente",
      type: "checking",
      isReal: true,
      initialBalance: 3500,
    });

    expect(res.status).toBe(201);
    expect(res.body.isReal).toBe(true);

    // O saldo real deve refletir o saldo inicial
    const dashRes = await req.get(`/api/dashboard?month=${M}&year=${Y}`);
    expect(dashRes.body.realBalance).toBe(3500);
  });

  it("conta sem isReal não afeta o saldo real", async () => {
    const req = await authed();
    await req.post("/api/accounts").send({
      name: "Conta Envelope",
      type: "cash",
      isReal: false,
      initialBalance: 1000,
    });

    const dashRes = await req.get(`/api/dashboard?month=${M}&year=${Y}`);
    expect(dashRes.body.realBalance).toBe(0);
  });
});

describe("DELETE /api/accounts/:id", () => {
  it("desativa a conta (soft delete)", async () => {
    const acc = await createAccount();
    const req = await authed();

    const delRes = await req.delete(`/api/accounts/${acc.id}`);
    expect(delRes.status).toBe(200);

    const listRes = await req.get(`/api/accounts?month=${M}&year=${Y}`);
    expect(listRes.body.accounts.every((a: { id: number }) => a.id !== acc.id)).toBe(true);
  });
});
