export interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
}

/** Dados do usuário expostos fora do módulo (nunca inclui o hash). */
export interface UserProfile {
  id: number;
  name: string;
  email: string;
}

export function toProfile(user: User): UserProfile {
  return { id: user.id, name: user.name, email: user.email };
}
