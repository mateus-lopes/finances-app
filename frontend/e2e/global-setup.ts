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

    if (existing.rowCount === 0) {
      const hash = await bcrypt.hash(E2E_PASSWORD, 4);
      await client.query("INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)", [E2E_NAME, E2E_EMAIL, hash]);
      console.log(`[E2E setup] Usuário ${E2E_EMAIL} criado.`);
    } else {
      // Atualiza a senha para garantir que está com o valor esperado
      const hash = await bcrypt.hash(E2E_PASSWORD, 4);
      await client.query("UPDATE users SET password_hash = $1 WHERE email = $2", [hash, E2E_EMAIL]);
      console.log(`[E2E setup] Usuário ${E2E_EMAIL} já existe — senha atualizada.`);
    }
  } finally {
    await client.end();
  }
}

export default globalSetup;
