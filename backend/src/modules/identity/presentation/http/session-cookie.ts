import type { CookieOptions } from "hono/utils/cookie";
import { SESSION_TTL_SECONDS } from "../../domain/session";

export const SESSION_COOKIE = "auth_token";

/**
 * Frontend e API são servidos pela mesma origem, então o cookie é
 * first-party: SameSite=Lax basta e não é bloqueado como cookie de terceiros.
 */
export function sessionCookieOptions(secure: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
