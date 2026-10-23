import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../../../shared/infrastructure/http/async-handler";
import { userIdOf, type RequireAuth } from "../../../../shared/infrastructure/http/auth-context";
import { parseBody } from "../../../../shared/infrastructure/http/validation";
import type { AnalyzeFinances } from "../../application/use-cases/analyze-finances";

const analyzeSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

export interface AiRouterDeps {
  requireAuth: RequireAuth;
  analyzeFinances: AnalyzeFinances;
}

export function createAiRouter({ requireAuth, analyzeFinances }: AiRouterDeps) {
  const router = Router();
  router.use(requireAuth);

  router.post("/analyze", asyncHandler(async (req, res) => {
    const body = parseBody(analyzeSchema, req.body, res);
    if (!body) return;
    try {
      res.json({ analysis: await analyzeFinances.execute(userIdOf(req), body) });
    } catch (err) {
      // Falha do provedor de IA é erro de dependência externa, não do servidor.
      const message = err instanceof Error ? err.message : String(err);
      console.error("[ai] analyze error:", message);
      res.status(502).json({ error: message });
    }
  }));

  return router;
}
