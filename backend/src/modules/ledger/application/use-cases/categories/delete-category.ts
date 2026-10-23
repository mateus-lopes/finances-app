import type { Category } from "../../../domain/category";
import type { CategoryRepository } from "../../ports";

/** Lançamentos da categoria ficam sem categoria (FK com ON DELETE SET NULL). */
export class DeleteCategory {
  constructor(private readonly categories: CategoryRepository) {}

  execute(userId: number, id: number): Promise<Category | null> {
    return this.categories.delete(userId, id);
  }
}
