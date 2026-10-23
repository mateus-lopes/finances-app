import type { Category, CategoryData } from "../../../domain/category";
import type { CategoryRepository } from "../../ports";

export class UpdateCategory {
  constructor(private readonly categories: CategoryRepository) {}

  execute(userId: number, id: number, data: CategoryData): Promise<Category | null> {
    return this.categories.update(userId, id, data);
  }
}
