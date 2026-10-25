import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import { userIdOf, type AppEnv, type RequireAuth } from "../../../../shared/infrastructure/http/auth-context";
import type { RateLimiter } from "../../../../shared/infrastructure/http/rate-limiter";
import { httpError, parseBody, readJson } from "../../../../shared/infrastructure/http/validation";
import type { Login } from "../../application/use-cases/login";
import type { GetCurrentUser } from "../../application/use-cases/get-current-user";
import type { ResetPassword } from "../../application/use-cases/reset-password";
import { SESSION_COOKIE, sessionCookieOptions } from "./session-cookie";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export interface AuthRouterDeps {
  login: Login;
  getCurrentUser: GetCurrentUser;
  resetPassword: ResetPassword;
  requireAuth: RequireAuth;
  loginRateLimiter: RateLimiter;
  isProduction: boolean;
}

export function createAuthRouter({ login, getCurrentUser, resetPassword, requireAuth, loginRateLimiter, isProduction }: AuthRouterDeps) {
  const router = new Hono<AppEnv>();
  const cookieOptions = sessionCookieOptions(isProduction);

  router.post("/login", async (c) => {
    const ip = c.req.header("cf-connecting-ip") ?? "local";
    if (!(await loginRateLimiter.allow(ip))) httpError(429, "Muitas tentativas. Tente novamente em alguns minutos.");

    const body = await parseBody(c, loginSchema);
    const result = await login.execute(body.email, body.password);
    if (!result) return c.json({ error: "Credenciais inválidas" }, 401);

    setCookie(c, SESSION_COOKIE, result.token, cookieOptions);
    return c.json({ user: result.user });
  });

  router.post("/reset-password", async (c) => {
    const { adminPassword, email, newPassword } = (await readJson(c)) as Record<string, string | undefined>;
    if (!adminPassword || !email || !newPassword) return c.json({ error: "Campos obrigatórios ausentes" }, 400);
    const result = await resetPassword.execute(adminPassword, email, newPassword);
    if (!result.ok) return c.json({ error: result.error }, 401);
    return c.json({ ok: true });
  });

  router.post("/logout", (c) => {
    deleteCookie(c, SESSION_COOKIE, { path: "/", secure: cookieOptions.secure });
    return c.json({ ok: true });
  });

  router.get("/me", requireAuth, async (c) => {
    const user = await getCurrentUser.execute(userIdOf(c));
    if (!user) return c.json({ error: "Usuário não encontrado" }, 401);
    return c.json({ user });
  });

  return router;
}
