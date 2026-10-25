import { getCookie } from "hono/cookie";
import type { RequireAuth } from "../../../../shared/infrastructure/http/auth-context";
import type { VerifySession } from "../../application/use-cases/verify-session";
import { SESSION_COOKIE } from "./session-cookie";

export function createRequireAuth(verifySession: VerifySession): RequireAuth {
  return async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE) ?? c.req.header("authorization")?.slice(7);

    if (!token) return c.json({ error: "Não autenticado" }, 401);

    const userId = await verifySession.execute(token);
    if (userId === null) return c.json({ error: "Token inválido ou expirado" }, 401);

    c.set("userId", userId);
    await next();
  };
}
