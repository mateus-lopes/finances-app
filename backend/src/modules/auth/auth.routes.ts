import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, type AuthRequest } from "../../middlewares/auth";
import { login, getMe, loginSchema, resetPassword } from "./auth.service";
import { env } from "../../config/env";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === "production" ? 10 : 10000,
  message: { error: "Muitas tentativas. Tente novamente em 15 minutos." },
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: env.NODE_ENV === "production" ? ("none" as const) : ("strict" as const),
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.post(
  "/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const result = await login(parsed.data.email, parsed.data.password);
    if (!result) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }

    res.cookie("auth_token", result.token, COOKIE_OPTIONS);
    res.json({ user: result.user });
  })
);

router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const { adminPassword, email, newPassword } = req.body;
    if (!adminPassword || !email || !newPassword) {
      res.status(400).json({ error: "Campos obrigatórios ausentes" });
      return;
    }
    const result = await resetPassword(adminPassword, email, newPassword);
    if (!result.ok) {
      res.status(401).json({ error: result.error });
      return;
    }
    res.json({ ok: true });
  })
);

router.post("/logout", (_req, res) => {
  res.clearCookie("auth_token");
  res.json({ ok: true });
});

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const user = await getMe(req.userId!);
    if (!user) {
      res.status(401).json({ error: "Usuário não encontrado" });
      return;
    }
    res.json({ user });
  })
);

export default router;
