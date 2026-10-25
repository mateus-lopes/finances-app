import { eq } from "drizzle-orm";
import type { Database } from "../../../db/client";
import { users } from "../../../db/schema/users";
import type { User, UserProfile } from "../domain/user";
import type { UserRepository } from "../application/ports";

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: Database) {}

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user ?? null;
  }

  async findProfileById(id: number): Promise<UserProfile | null> {
    const [user] = await this.db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, id));
    return user ?? null;
  }

  async updatePasswordHash(id: number, passwordHash: string): Promise<void> {
    await this.db.update(users).set({ passwordHash }).where(eq(users.id, id));
  }
}
