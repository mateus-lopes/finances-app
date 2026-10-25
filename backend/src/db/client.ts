import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Driver HTTP do Neon: cada query é um fetch, sem conexão persistente. Funciona
 * igual no Workers (onde I/O não pode ser compartilhado entre requisições) e no Node.
 */
export function createDatabase(databaseUrl: string) {
  return drizzle(neon(databaseUrl), { schema });
}

export type Database = ReturnType<typeof createDatabase>;
