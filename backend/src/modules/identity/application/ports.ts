import type { User, UserProfile } from "../domain/user";

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findProfileById(id: number): Promise<UserProfile | null>;
  updatePasswordHash(id: number, passwordHash: string): Promise<void>;
}

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}

export interface SessionTokenService {
  issue(user: UserProfile): string;
  /** Retorna o id do usuário ou null se o token for inválido/expirado. */
  verify(token: string): number | null;
}
