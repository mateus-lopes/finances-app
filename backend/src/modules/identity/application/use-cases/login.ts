import { toProfile, type UserProfile } from "../../domain/user";
import type { PasswordHasher, SessionTokenService, UserRepository } from "../ports";

export interface LoginResult {
  token: string;
  user: UserProfile;
}

export class Login {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: SessionTokenService,
  ) {}

  async execute(email: string, password: string): Promise<LoginResult | null> {
    const user = await this.users.findByEmail(email);
    if (!user) return null;

    const valid = await this.hasher.compare(password, user.passwordHash);
    if (!valid) return null;

    const profile = toProfile(user);
    return { token: await this.tokens.issue(profile), user: profile };
  }
}
