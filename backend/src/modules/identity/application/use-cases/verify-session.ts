import type { SessionTokenService } from "../ports";

export class VerifySession {
  constructor(private readonly tokens: SessionTokenService) {}

  /** Retorna o id do usuário autenticado ou null. */
  execute(token: string): number | null {
    return this.tokens.verify(token);
  }
}
