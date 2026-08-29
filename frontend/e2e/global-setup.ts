import { Client } from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../backend/.env") });

export const E2E_EMAIL = "playwright-e2e@test.local";
export const E2E_PASSWORD = "PlaywrightE2E123!";
export const E2E_NAME = "Playwright E2E User";

async function globalSetup() {
  const databaseUrl = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL não configurado para testes E2E");

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const existing = await client.query("SELECT id FROM users WHERE email = $1", [E2E_EMAIL]);

    let userId: number;

    if (existing.rowCount === 0) {
      const hash = await bcrypt.hash(E2E_PASSWORD, 4);
      const result = await client.query(
        "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
        [E2E_NAME, E2E_EMAIL, hash]
      );
      userId = result.rows[0].id;
      console.log(`[E2E setup] Usuário ${E2E_EMAIL} criado (id=${userId}).`);
    } else {
      userId = existing.rows[0].id;
      const hash = await bcrypt.hash(E2E_PASSWORD, 4);
      await client.query("UPDATE users SET password_hash = $1 WHERE email = $2", [hash, E2E_EMAIL]);
      console.log(`[E2E setup] Usuário ${E2E_EMAIL} já existe (id=${userId}) — senha atualizada.`);
    }

    // Garantir que o usuário tem pelo menos uma conta corrente para os testes
    const accountExists = await client.query(
      "SELECT id FROM accounts WHERE user_id = $1 AND name = 'Conta Teste E2E' LIMIT 1",
      [userId]
    );
    if (accountExists.rowCount === 0) {
      await client.query(
        "INSERT INTO accounts (user_id, name, type, is_real, active) VALUES ($1, 'Conta Teste E2E', 'checking', true, true)",
        [userId]
      );
      console.log(`[E2E setup] Conta corrente criada para userId=${userId}.`);
    }
  } finally {
    await client.end();
  }
}

export default globalSetup;
