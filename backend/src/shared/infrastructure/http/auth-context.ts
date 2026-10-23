import type { Request, RequestHandler } from "express";

/** Request após passar pelo middleware de autenticação do módulo identity. */
export interface AuthRequest extends Request {
  userId?: number;
}

/** Middleware que garante `req.userId` (implementado pelo módulo identity). */
export type RequireAuth = RequestHandler;

export function userIdOf(req: Request): number {
  const userId = (req as AuthRequest).userId;
  if (userId === undefined) throw new Error("Rota protegida sem middleware requireAuth");
  return userId;
}
