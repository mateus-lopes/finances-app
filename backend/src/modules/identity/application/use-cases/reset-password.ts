import type { PasswordHasher, UserRepository } from "../ports";

export type ResetPasswordResult = { ok: true } | { ok: false; error: string };

/** Redefinição protegida por uma senha administrativa (variável ADMIN_RESET_PASSWORD). */
export class ResetPassword {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly adminPassword: string,
  ) {}

  async execute(adminPassword: string, email: string, newPassword: string): Promise<ResetPasswordResult> {
    if (!this.adminPassword || adminPassword !== this.adminPassword) {
      return { ok: false, error: "Senha admin inválida" };
    }
    const user = await this.users.findByEmail(email);
    if (!user) return { ok: false, error: "Usuário não encontrado" };

    await this.users.updatePasswordHash(user.id, await this.hasher.hash(newPassword));
    return { ok: true };
  }
}
