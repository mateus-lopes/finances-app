import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../config/env";
import * as schema from "./schema";

const isTest = env.NODE_ENV === "test";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: isTest ? 5 : 20,
  idleTimeoutMillis: 30000,
  // Neon tem cold start lento — testes precisam de mais tempo
  connectionTimeoutMillis: isTest ? 15000 : 2000,
});

export const db = drizzle(pool, { schema });
