import "dotenv/config";
import { createDatabase } from "./client";

/** Conexão para scripts e testes no Node, a partir do `.env`. */
export const db = createDatabase(process.env.DATABASE_URL ?? "");
