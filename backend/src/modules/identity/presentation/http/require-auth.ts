import type { Response, NextFunction } from "express";
import type { AuthRequest, RequireAuth } from "../../../../shared/infrastructure/http/auth-context";
import type { VerifySession } from "../../application/use-cases/verify-session";
import { SESSION_COOKIE } from "./session-cookie";

export function createRequireAuth(verifySession: VerifySession): RequireAuth {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.cookies?.[SESSION_COOKIE] ?? req.headers.authorization?.slice(7);

    if (!token) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }

    const userId = verifySession.execute(token);
    if (userId === null) {
      res.status(401).json({ error: "Token inválido ou expirado" });
      return;
    }

    req.userId = userId;
    next();
  };
}
