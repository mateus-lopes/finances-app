import jwt from "jsonwebtoken";
import { SESSION_TTL_SECONDS } from "../domain/session";
import type { UserProfile } from "../domain/user";
import type { SessionTokenService } from "../application/ports";

export class JwtSessionTokenService implements SessionTokenService {
  constructor(private readonly secret: string) {}

  issue(user: UserProfile): string {
    return jwt.sign({ sub: user.id, email: user.email }, this.secret, { expiresIn: SESSION_TTL_SECONDS });
  }

  verify(token: string): number | null {
    try {
      const payload = jwt.verify(token, this.secret) as unknown as { sub: number };
      return payload.sub;
    } catch {
      return null;
    }
  }
}
