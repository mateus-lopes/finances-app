import type { Category } from "../../../domain/category";
import type { CategoryRepository } from "../../ports";

export class ListCategories {
  constructor(private readonly categories: CategoryRepository) {}

  execute(userId: number): Promise<Category[]> {
    return this.categories.list(userId);
  }
}
