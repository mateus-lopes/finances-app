import type { UserProfile } from "../../domain/user";
import type { UserRepository } from "../ports";

export class GetCurrentUser {
  constructor(private readonly users: UserRepository) {}

  execute(userId: number): Promise<UserProfile | null> {
    return this.users.findProfileById(userId);
  }
}
