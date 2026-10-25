import { Hono } from "hono";
import { z } from "zod";
import { userIdOf, type AppEnv, type RequireAuth } from "../../../../shared/infrastructure/http/auth-context";
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
  const router = new Hono<AppEnv>();
  router.use(deps.requireAuth);

  router.get("/", async (c) => {
    return c.json(await deps.listCategories.execute(userIdOf(c)));
  });

  router.post("/", async (c) => {
    const body = await parseBody(c, categorySchema);
    return c.json(await deps.createCategory.execute(userIdOf(c), body), 201);
  });

  router.put("/:id", async (c) => {
    const id = parseIdParam(c);
    const body = await parseBody(c, categorySchema);
    const category = await deps.updateCategory.execute(userIdOf(c), id, body);
    if (!category) return c.json({ error: "Categoria não encontrada" }, 404);
    return c.json(category);
  });

  router.delete("/:id", async (c) => {
    const id = parseIdParam(c);
    const category = await deps.deleteCategory.execute(userIdOf(c), id);
    if (!category) return c.json({ error: "Categoria não encontrada" }, 404);
    return c.json({ ok: true });
  });

  return router;
}
