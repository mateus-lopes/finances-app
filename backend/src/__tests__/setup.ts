import { beforeAll, afterAll } from "vitest";
import bcrypt from "bcrypt";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { users, accounts, categories, transactions, bills, billOccurrences, creditCardInvoices } from "../db/schema";

export const TEST_EMAIL = "vitest-test-user@test.local";
export const TEST_PASSWORD = "TestPassword123!";
export const TEST_NAME = "Vitest Test User";

let _testUserId: number | null = null;

export function getTestUserId(): number {
  if (!_testUserId) throw new Error("Test user not initialized — ensure setup ran");
  return _testUserId;
}

async function cleanTestUser() {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, TEST_EMAIL));
  if (!user) return;
  const uid = user.id;
  // Deleta em ordem respeitando foreign keys
  await db.delete(creditCardInvoices).where(eq(creditCardInvoices.userId, uid));
  await db.delete(billOccurrences).where(eq(billOccurrences.userId, uid));
  await db.delete(transactions).where(eq(transactions.userId, uid));
  await db.delete(bills).where(eq(bills.userId, uid));
  await db.delete(categories).where(eq(categories.userId, uid));
  await db.delete(accounts).where(eq(accounts.userId, uid));
  await db.delete(users).where(eq(users.id, uid));
}

beforeAll(async () => {
  // Aquece a pool sequencialmente (Neon tem cold start lento)
  // max pool = 5 em teste, então 5 queries sequenciais estabelecem todas as conexões
  for (let i = 0; i < 5; i++) {
    await db.execute(sql`SELECT 1`);
  }

  await cleanTestUser();
  const hash = await bcrypt.hash(TEST_PASSWORD, 4); // custo baixo para velocidade
  const [user] = await db.insert(users).values({
    name: TEST_NAME,
    email: TEST_EMAIL,
    passwordHash: hash,
  }).returning();
  _testUserId = user.id;
});

afterAll(async () => {
  await cleanTestUser();
  _testUserId = null;
});
