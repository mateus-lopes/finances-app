import { Hono } from "hono";
import { z } from "zod";
import { userIdOf, type AppEnv, type RequireAuth } from "../../../../shared/infrastructure/http/auth-context";
import { parseBody } from "../../../../shared/infrastructure/http/validation";
import type { ApplyKeywordRules } from "../../application/use-cases/apply-keyword-rules";

const applySchema = z.object({
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
});

export interface CategorizerRouterDeps {
  requireAuth: RequireAuth;
  applyKeywordRules: ApplyKeywordRules;
}

export function createCategorizerRouter({ requireAuth, applyKeywordRules }: CategorizerRouterDeps) {
  const router = new Hono<AppEnv>();
  router.use(requireAuth);

  router.post("/apply", async (c) => {
    const body = await parseBody(c, applySchema);
    return c.json(await applyKeywordRules.execute(userIdOf(c), body));
  });

  return router;
}
