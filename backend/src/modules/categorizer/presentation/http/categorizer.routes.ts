import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../../../shared/infrastructure/http/async-handler";
import { userIdOf, type RequireAuth } from "../../../../shared/infrastructure/http/auth-context";
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
  const router = Router();
  router.use(requireAuth);

  router.post("/apply", asyncHandler(async (req, res) => {
    const body = parseBody(applySchema, req.body, res);
    if (!body) return;
    res.json(await applyKeywordRules.execute(userIdOf(req), body));
  }));

  return router;
}
