import { sign, verify } from "hono/jwt";
import { SESSION_TTL_SECONDS } from "../domain/session";
import type { UserProfile } from "../domain/user";
import type { SessionTokenService } from "../application/ports";

/** JWT HS256 via WebCrypto — aceita os tokens emitidos antes da migração (jsonwebtoken). */
export class JwtSessionTokenService implements SessionTokenService {
  constructor(private readonly secret: string) {}

  issue(user: UserProfile): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    return sign({ sub: user.id, email: user.email, iat: now, exp: now + SESSION_TTL_SECONDS }, this.secret, "HS256");
  }

  async verify(token: string): Promise<number | null> {
    try {
      const payload = await verify(token, this.secret, "HS256");
      return typeof payload.sub === "number" ? payload.sub : null;
    } catch {
      return null;
    }
  }
}
