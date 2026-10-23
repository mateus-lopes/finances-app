import type { Category, CategoryData } from "../../../domain/category";
import type { CategoryRepository } from "../../ports";

export class CreateCategory {
  constructor(private readonly categories: CategoryRepository) {}

  execute(userId: number, data: CategoryData): Promise<Category> {
    return this.categories.create(userId, data);
  }
}
