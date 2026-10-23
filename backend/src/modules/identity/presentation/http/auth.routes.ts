import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { asyncHandler } from "../../../../shared/infrastructure/http/async-handler";
import { userIdOf, type RequireAuth } from "../../../../shared/infrastructure/http/auth-context";
import { parseBody } from "../../../../shared/infrastructure/http/validation";
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
  isProduction: boolean;
}

export function createAuthRouter({ login, getCurrentUser, resetPassword, requireAuth, isProduction }: AuthRouterDeps) {
  const router = Router();
  const cookieOptions = sessionCookieOptions(isProduction);

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 10 : 10000,
    message: { error: "Muitas tentativas. Tente novamente em 15 minutos." },
  });

  router.post("/login", loginLimiter, asyncHandler(async (req, res) => {
    const body = parseBody(loginSchema, req.body, res);
    if (!body) return;

    const result = await login.execute(body.email, body.password);
    if (!result) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }

    res.cookie(SESSION_COOKIE, result.token, cookieOptions);
    res.json({ user: result.user });
  }));

  router.post("/reset-password", asyncHandler(async (req, res) => {
    const { adminPassword, email, newPassword } = req.body;
    if (!adminPassword || !email || !newPassword) {
      res.status(400).json({ error: "Campos obrigatórios ausentes" });
      return;
    }
    const result = await resetPassword.execute(adminPassword, email, newPassword);
    if (!result.ok) {
      res.status(401).json({ error: result.error });
      return;
    }
    res.json({ ok: true });
  }));

  router.post("/logout", (_req, res) => {
    const { maxAge: _maxAge, ...clearOptions } = cookieOptions;
    res.clearCookie(SESSION_COOKIE, clearOptions);
    res.json({ ok: true });
  });

  router.get("/me", requireAuth, asyncHandler(async (req, res) => {
    const user = await getCurrentUser.execute(userIdOf(req));
    if (!user) {
      res.status(401).json({ error: "Usuário não encontrado" });
      return;
    }
    res.json({ user });
  }));

  return router;
}
