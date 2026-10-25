import type { Context, MiddlewareHandler } from "hono";

/** Variáveis de contexto disponíveis após o middleware de autenticação do módulo identity. */
export interface AppEnv {
  Variables: { userId: number };
}

/** Middleware que garante `userId` no contexto (implementado pelo módulo identity). */
export type RequireAuth = MiddlewareHandler<AppEnv>;

export function userIdOf(c: Context<AppEnv>): number {
  const userId = c.get("userId");
  if (userId === undefined) throw new Error("Rota protegida sem middleware requireAuth");
  return userId;
}
