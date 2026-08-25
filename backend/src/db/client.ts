import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../config/env";
import * as schema from "./schema";

const isTest = env.NODE_ENV === "test";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: isTest ? 5 : 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: isTest ? 15000 : 10000,
});

// Neon auto-suspende conexões idle — sem esse handler o processo crasha
pool.on("error", (err) => {
  console.error("Unexpected pool error:", err);
});

export const db = drizzle(pool, { schema });
