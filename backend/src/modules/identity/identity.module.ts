import type { Router } from "express";
import type { Database } from "../../db/client";
import type { RequireAuth } from "../../shared/infrastructure/http/auth-context";
import { Login } from "./application/use-cases/login";
import { GetCurrentUser } from "./application/use-cases/get-current-user";
import { ResetPassword } from "./application/use-cases/reset-password";
import { VerifySession } from "./application/use-cases/verify-session";
import { DrizzleUserRepository } from "./infrastructure/drizzle-user-repository";
import { BcryptPasswordHasher } from "./infrastructure/bcrypt-password-hasher";
import { JwtSessionTokenService } from "./infrastructure/jwt-session-token-service";
import { createAuthRouter } from "./presentation/http/auth.routes";
import { createRequireAuth } from "./presentation/http/require-auth";

export interface IdentityModuleDeps {
  db: Database;
  jwtSecret: string;
  adminResetPassword: string;
  isProduction: boolean;
}

export interface IdentityModule {
  router: Router;
  /** Middleware usado pelos demais módulos para proteger suas rotas. */
  requireAuth: RequireAuth;
}

export function createIdentityModule(deps: IdentityModuleDeps): IdentityModule {
  const users = new DrizzleUserRepository(deps.db);
  const hasher = new BcryptPasswordHasher();
  const tokens = new JwtSessionTokenService(deps.jwtSecret);

  const requireAuth = createRequireAuth(new VerifySession(tokens));
  const router = createAuthRouter({
    login: new Login(users, hasher, tokens),
    getCurrentUser: new GetCurrentUser(users),
    resetPassword: new ResetPassword(users, hasher, deps.adminResetPassword),
    requireAuth,
    isProduction: deps.isProduction,
  });

  return { router, requireAuth };
}
