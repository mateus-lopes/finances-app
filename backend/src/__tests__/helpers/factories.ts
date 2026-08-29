import { db } from "../../db/client";
import { accounts, categories, transactions, bills } from "../../db/schema";
import { getTestUserId } from "../setup";

const MONTH = 8;
const YEAR = 2026;

export async function createAccount(overrides: Record<string, unknown> = {}) {
  const [account] = await db.insert(accounts).values({
    userId: getTestUserId(),
    name: "Conta Teste",
    type: "checking",
    color: "#8b5cf6",
    isReal: false,
    showProgress: false,
    ...overrides,
  }).returning();
  return account;
}

export async function createCategory(overrides: Record<string, unknown> = {}) {
  const [category] = await db.insert(categories).values({
    userId: getTestUserId(),
    name: "Categoria Teste",
    color: "#34d399",
    ...overrides,
  }).returning();
  return category;
}

export async function createTransaction(overrides: Record<string, unknown> = {}) {
  const month = (overrides.month as number) ?? MONTH;
  const year = (overrides.year as number) ?? YEAR;
  const pad = (n: number) => String(n).padStart(2, "0");

  const [tx] = await db.insert(transactions).values({
    userId: getTestUserId(),
    type: "expense",
    amount: "100.00",
    date: `${year}-${pad(month)}-15`,
    month,
    year,
    description: "Transação Teste",
    ...overrides,
  }).returning();
  return tx;
}

export async function createBill(overrides: Record<string, unknown> = {}) {
  const [bill] = await db.insert(bills).values({
    userId: getTestUserId(),
    name: "Recorrente Teste",
    type: "expense",
    amount: "200.00",
    frequency: "monthly",
    startDate: `${YEAR}-01-01`,
    ...overrides,
  }).returning();
  return bill;
}
