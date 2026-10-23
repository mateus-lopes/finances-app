import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../../../shared/infrastructure/http/async-handler";
import { userIdOf, type RequireAuth } from "../../../../shared/infrastructure/http/auth-context";
import { parseBody, parseIdParam } from "../../../../shared/infrastructure/http/validation";
import type { ListCategories } from "../../application/use-cases/categories/list-categories";
import type { CreateCategory } from "../../application/use-cases/categories/create-category";
import type { UpdateCategory } from "../../application/use-cases/categories/update-category";
import type { DeleteCategory } from "../../application/use-cases/categories/delete-category";

const categorySchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().optional(),
});

export interface CategoriesRouterDeps {
  requireAuth: RequireAuth;
  listCategories: ListCategories;
  createCategory: CreateCategory;
  updateCategory: UpdateCategory;
  deleteCategory: DeleteCategory;
}

export function createCategoriesRouter(deps: CategoriesRouterDeps) {
  const router = Router();
  router.use(deps.requireAuth);

  router.get("/", asyncHandler(async (req, res) => {
    res.json(await deps.listCategories.execute(userIdOf(req)));
  }));

  router.post("/", asyncHandler(async (req, res) => {
    const body = parseBody(categorySchema, req.body, res);
    if (!body) return;
    res.status(201).json(await deps.createCategory.execute(userIdOf(req), body));
  }));

  router.put("/:id", asyncHandler(async (req, res) => {
    const id = parseIdParam(req, res);
    if (id === null) return;
    const body = parseBody(categorySchema, req.body, res);
    if (!body) return;
    const category = await deps.updateCategory.execute(userIdOf(req), id, body);
    if (!category) { res.status(404).json({ error: "Categoria não encontrada" }); return; }
    res.json(category);
  }));

  router.delete("/:id", asyncHandler(async (req, res) => {
    const id = parseIdParam(req, res);
    if (id === null) return;
    const category = await deps.deleteCategory.execute(userIdOf(req), id);
    if (!category) { res.status(404).json({ error: "Categoria não encontrada" }); return; }
    res.json({ ok: true });
  }));

  return router;
}
