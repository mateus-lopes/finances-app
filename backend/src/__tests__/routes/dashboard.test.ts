import { describe, it, expect, beforeEach } from "vitest";
import { authed } from "../helpers/client";
import { createAccount, createTransaction } from "../helpers/factories";
import { db } from "../../db/client";
import { accounts, transactions, billOccurrences, bills } from "../../db/schema";
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

describe("GET /api/dashboard", () => {
  it("retorna todos os campos do contrato", async () => {
    const req = await authed();
    const res = await req.get(`/api/dashboard?month=${M}&year=${Y}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      month: M,
      year: Y,
      totalIncome: expect.any(Number),
      totalExpenses: expect.any(Number),
      saldo: expect.any(Number),
      savingsRate: expect.any(Number),
      freeToSpend: expect.any(Number),
      commitmentPct: expect.any(Number),
      realBalance: expect.any(Number),
      accountSummary: {
        liquidTotal: expect.any(Number),
        investmentTotal: expect.any(Number),
        openInvoiceTotal: expect.any(Number),
      },
      breakdown: {
        pendingBillExpense: expect.any(Number),
        pendingBillIncome: expect.any(Number),
      },
    });
  });

  it("realBalance inclui apenas contas isReal=true", async () => {
    const real = await createAccount({ isReal: true });
    const naoReal = await createAccount({ isReal: false, name: "Carteira" });

    await createTransaction({ type: "income", amount: "5000.00", toAccountId: real.id });
    await createTransaction({ type: "income", amount: "1000.00", toAccountId: naoReal.id });

    const req = await authed();
    const res = await req.get(`/api/dashboard?month=${M}&year=${Y}`);

    expect(res.body.realBalance).toBe(5000);
  });

  it("realBalance inclui isInitialBalance mas exclui isCarryOver", async () => {
    const acc = await createAccount({ isReal: true });

    await createTransaction({ type: "income", amount: "2000.00", toAccountId: acc.id, isInitialBalance: true });
    await createTransaction({ type: "income", amount: "500.00", toAccountId: acc.id, isCarryOver: true });
    await createTransaction({ month: M, year: Y, type: "income", amount: "1000.00", toAccountId: acc.id });

    const req = await authed();
    const res = await req.get(`/api/dashboard?month=${M}&year=${Y}`);

    // realBalance = 2000 (inicial) + 500 (carryOver — ainda conta no real) + 1000 = 3500
    expect(res.body.realBalance).toBe(3500);
  });

  it("savingsRate = (saldo / totalIncome) * 100", async () => {
    const acc = await createAccount();
    await createTransaction({ month: M, year: Y, type: "income", amount: "4000.00", toAccountId: acc.id });
    await createTransaction({ month: M, year: Y, type: "expense", amount: "1000.00", fromAccountId: acc.id });

    const req = await authed();
    const res = await req.get(`/api/dashboard?month=${M}&year=${Y}`);

    expect(res.body.totalIncome).toBe(4000);
    expect(res.body.totalExpenses).toBe(1000);
    expect(res.body.saldo).toBe(3000);
    expect(res.body.savingsRate).toBeCloseTo(75, 1);
  });

  it("saldo zero quando não há transações", async () => {
    const req = await authed();
    const res = await req.get(`/api/dashboard?month=${M}&year=${Y}`);

    expect(res.body.totalIncome).toBe(0);
    expect(res.body.totalExpenses).toBe(0);
    expect(res.body.saldo).toBe(0);
    expect(res.body.savingsRate).toBe(0);
    expect(res.body.realBalance).toBe(0);
  });
});

describe("GET /api/dashboard/history", () => {
  it("retorna array com N meses em ordem cronológica", async () => {
    const req = await authed();
    const res = await req.get(`/api/dashboard/history?endMonth=${M}&endYear=${Y}&months=3`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(3);

    // Último item é o mês corrente
    expect(res.body[2].month).toBe(M);
    expect(res.body[2].year).toBe(Y);
    // Penúltimo é o mês anterior
    expect(res.body[1].month).toBe(M - 1);
  });

  it("cada item tem income, expenses, saldo, savingsRate", async () => {
    const req = await authed();
    const res = await req.get(`/api/dashboard/history?endMonth=${M}&endYear=${Y}&months=1`);

    expect(res.body[0]).toMatchObject({
      month: expect.any(Number),
      year: expect.any(Number),
      income: expect.any(Number),
      expenses: expect.any(Number),
      saldo: expect.any(Number),
      savingsRate: expect.any(Number),
    });
  });
});
