import { and, eq } from "drizzle-orm";
import type { Database } from "../../../db/client";
import { categories } from "../../../db/schema/categories";
import type { CategoryRef } from "../../../shared/kernel/types";
import type { Category, CategoryData } from "../domain/category";
import type { CategoryRepository } from "../application/ports";

export class DrizzleCategoryRepository implements CategoryRepository {
  constructor(private readonly db: Database) {}

  list(userId: number): Promise<Category[]> {
    return this.db.select().from(categories).where(eq(categories.userId, userId));
  }

  listRefs(userId: number): Promise<CategoryRef[]> {
    return this.db
      .select({ id: categories.id, name: categories.name, color: categories.color })
      .from(categories)
      .where(eq(categories.userId, userId));
  }

  async create(userId: number, data: CategoryData): Promise<Category> {
    const [category] = await this.db.insert(categories).values({ userId, ...data }).returning();
    return category;
  }

  async update(userId: number, id: number, data: CategoryData): Promise<Category | null> {
    const [category] = await this.db
      .update(categories)
      .set(data)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning();
    return category ?? null;
  }

  async delete(userId: number, id: number): Promise<Category | null> {
    const [category] = await this.db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning();
    return category ?? null;
  }
}
